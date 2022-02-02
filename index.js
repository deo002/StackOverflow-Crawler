const axios = require('axios');
const cheerio = require('cheerio');
const ObjectsToCsv = require('objects-to-csv');
const Queue = require("./queue.js");
const Node = require('./node.js');
const {
    fetchElemAttribute,
    extractFromElems,
    rateLimiter
} = require('./helpers.js');

const BASE_URL = 'https://stackoverflow.com';
const START_URL = 'https://stackoverflow.com/questions';
const MAX_VISITED_PAGES = 500;
const MAX_CONCURRENCY = 5;
const DELAY = 5000;
const CSV_FILE_PATH = './test.csv';

const queue = new Queue();
const visitedQuestions = new Map();
const queuedOrVisitedPages = new Set();

queue.enqueue(START_URL);
queuedOrVisitedPages.add(START_URL);

(async () => {

    let visitedPageCount = 0;

    while (!queue.empty()) {

        if (visitedPageCount > MAX_VISITED_PAGES)
            break;

        try {
            const urls = [];

            for (let i = 0; i < MAX_CONCURRENCY && !queue.empty(); ++i) {
                urls.push(queue.dequeue());
            }

            const requests = [];
            for (let url of urls) {
                requests.push(axios.get(url));
            }

            /*
            * Concurrently execute MAX_CONCURRENCY http requestss
            */
            const results = await Promise.all(requests);

            visitedPageCount += results.length;

            for (let i = 0; i < results.length; ++i) {

                const { data } = results[i];

                let $ = cheerio.load(data);

                /*
                * If it is a question page, scrape it for upvotes and answers
                */
                if (urls[i].startsWith(`${BASE_URL}/questions`) && urls[i][36] >= '0' && urls[i][36] <= '9') {
                    const questionDiv = $('div#question');
                    const questionUpvotes = fetchElemAttribute('data-score')(questionDiv);

                    const answerHeading = $('div#answers h2.mb0');
                    const totalAnswers = answerHeading ? fetchElemAttribute('data-answercount')(answerHeading) : 0;

                    const stats = new Node();
                    stats.answers = parseInt(totalAnswers);
                    stats.upvotes = parseInt(questionUpvotes);

                    visitedQuestions.set(urls[i], stats);
                }

                const anchorTags = $('a');
                const extractURLS = extractFromElems(fetchElemAttribute('href'))();
                const links = extractURLS(anchorTags)($);

                /*
                * Add urls to queue that have not been already visited and are not already in queue 
                */
                for (let link of links) {
                    if (link[0] === '/') {

                        const fullLink = `${BASE_URL}${link}`;

                        if (urls[i].startsWith('/questions') && urls[i][11] >= '0' && urls[i][11] <= '9') {
                            if (visitedQuestions.has(fullLink)) {
                                const stats = visitedQuestions.get(fullLink);
                                stats.referenceCount++;
                                visitedQuestions.set(fullLink, stats);
                            }
                        }

                        if (!queuedOrVisitedPages.has(fullLink)) {
                            queue.enqueue(fullLink);
                            queuedOrVisitedPages.add(fullLink);
                        }
                    }
                }

            }

        } catch (e) {
            console.log("Error processing one of the requests: " + e.toString().substr(0, 100) + "...\n");
        }
        /*
        * TImeout for DELAY secs after processing of every concurrent requests
        */
        await rateLimiter(DELAY);
    }

    const visitedQuestionsArray = [];

    for (const [key, value] of visitedQuestions.entries()) {
        const obj = {
            key,
            ...value
        };
        visitedQuestionsArray.push(obj);
    }
    visitedQuestions.clear();
    queuedOrVisitedPages.clear();

    const csv = new ObjectsToCsv(visitedQuestionsArray);

    await csv.toDisk(CSV_FILE_PATH);

})();