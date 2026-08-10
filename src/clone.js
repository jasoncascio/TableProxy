/**
 * Basic cloning - supports input types {null,undefined,Date,Array,Object,String,Number)
 * @desc taken from https://stackoverflow.com/questions/728360/how-do-i-correctly-clone-a-javascript-object
 */

import { typeTag } from './utilities.js';

export default function clone(input) {
  let copy;
  const toStringType = typeTag(input);
  switch (toStringType) {
    case '[object Undefined]':
    case '[object Null]':
    case '[object Number]':
    case '[object String]':
    case '[object Boolean]':
      copy = input;
      break;
    case '[object Array]':
      copy = input.map((i) => {
        return clone(i);
      });
      break;
    case '[object Object]':
      if (input === undefined || input === null) {
        copy = input;
      } else {
        copy = {};
        Object.keys(input).forEach((property) => {
          copy[property] = clone(input[property]);
        });
      }
      break;
    case '[object Date]':
      copy = new Date();
      copy.setTime(input.getTime());
      break;
    default:
      throw new TypeError(`Unable to clone: object type ${toStringType} is unsupported.`);
  }
  return copy;
}
