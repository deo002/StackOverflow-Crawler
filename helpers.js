const _ = require('lodash');

/*
 * Fetches the specified attribute from the element
 * and returns the attribute value
 */
const fetchElemAttribute = attribute => elem =>
    (elem.attr && elem.attr(attribute)) || null;

/*
 * Extract an array of values from a collection of elements
 * using the extractor function and returns the array
 * or the return value from calling transform() on array
 */
const extractFromElems = extractor => transform => elems => $ => {
    const results = elems.map((i, element) => extractor($(element))).get();
    return _.isFunction(transform) ? transform(results) : results;
};

/*
 * Too many requests to the STACKOVERFLOW server will get
 * us rate-limited. So, we should rate-limit our requests instead.   
 */
const rateLimiter = ms => {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
    fetchElemAttribute,
    extractFromElems,
    rateLimiter
};
