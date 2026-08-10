/**
 * Timer/Logger
 * @return {Object}
 */

import { getTimeStamp, getTimeDiff, isString } from './utilities.js';
import { log } from './sheets-utilities.js';

export default class Timer {
  constructor(text, suppressLogStart) {
    if (!isString(text)) {
      throw new Error(`Timer requires text.`);
    }

    this.text = text;
    this.startTime = getTimeStamp();
    this.duration = null;

    if (suppressLogStart !== true) {
      log(`${this.text} operation started`);
    }
  }

  getStartTime() {
    return this.startTime;
  }

  getDuration() {
    return this.duration;
  }

  getText() {
    return this.text;
  }

  stop(text) {
    const endText = isString(text) ? `\n${text}` : '';
    this.duration = getTimeDiff(this.startTime, 0);
    log(`${this.text} operation completed in ${this.duration}ms${endText}`);
    return this.duration;
  }
}
