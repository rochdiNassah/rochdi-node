'use strict';

const util = require('node:util');
const https = require('node:https');
const format = util.format;
const http2 = require('node:http2');

// anti production
global.exit = (...args) => console.log(...args)(process.exit(0));

const actionsLockRegistry = new Map();
exports.lockAction = function (type, cb) {
  return actionsLockRegistry.get(type)  ? false : (
    actionsLockRegistry.set(type, true),
    cb(actionsLockRegistry.set.bind(actionsLockRegistry, type, false)),
    true
  );
};

exports.benchmark = function (...functions) {
  const { formatDuration } = exports;
  const result = {};
  let winner = { duration: Infinity };


  functions.shuffle().forEach(func => {
    const timeStart = new Date();
    const label = func() ?? 'unknown';
    const duration = new Date()-timeStart;

    if (duration < winner.duration)
      winner = { label, duration };

    result[label] = formatDuration(duration);
  });

  return { ...result, winner: winner.label };
};

exports.parseHeaders = function (base64) {
  const raw = Buffer.from(base64, 'base64').toString('utf8')
    .replace(/(POST|GET)\s\/.*\n/ig, '')
    .replace(/Content\-Length: \d{1,}\r\n/ig, '');
  const lines = raw.split(/\n/);
  const result = {};
  lines.forEach(line => {
    const [key, value] = line.split(/:\s/);
    result[key] = value;
  });
  return console.log(result), result;
};

exports.getType = function (value) {
  return 'object' !== typeof value ? typeof value : null === value ? 'null' : Array.isArray(value) ? 'array' : 'object';
};

exports.base64ToUrlSafe = function (input) {
  return input.replace(/\+/g,"-").replace(/\//g,"_").replace(/[=]+$/,"");
};

exports.decodeHTMLEntities = function (input) {
  return input.replace(/&amp;/g, '&');
};

const timerRegistry = {};
exports.endTimer = function (label, format = true) {
  if ('string' !== typeof label || !label.length) {
    throw new Error('helpers.endTimer: label must be a valid string');
  }

  const currDate = new Date();
  const prevDate = timerRegistry[label];

  if (void 0 === prevDate) return null;

  delete timerRegistry[label];

  const result = currDate-prevDate;
  return format && result ? exports.formatDuration(result) : result;
};

exports.startTimer = function (label) {
  if ('string' !== typeof label || !label.length) {
    throw new Error('helpers.startTimer: Expects label to be of type string and of length greater than 1.');
  }
  if (timerRegistry[label]) {
    return false;
  }
  timerRegistry[label] = new Date();
};

exports.padString = function (string, padding, length = null, padRight = true) {
  if (!Number.isInteger(length)) {
    if (padRight) {
      if (!string.endsWith(padding)) {
        string += padding;
      }
    } else {
      if (!string.startsWith(padding)) {
        string = padding + string;
      }
    }
  } else if (length !== string.length && length > 0) {
    if (padRight) {
      string += padding.repeat(length - string.length);
    } else {
      string = padding.repeat(length - string.length) + string;
    }
  }
  return string;
};

const agent = new https.Agent({ keepAlive: true, maxSockets: Infinity });
exports.request = function (opts = {}) {
  return new Promise(resolve => {
    const { hostname, port, path, method, headers, body } = opts;

    const req = https.request({ hostname, port, path, method, headers, agent }, res => {
      const buff = [];
      if ('gzip' === res.headers['content-encoding']) {
        const zlib = require('zlib');
        const gunzip = zlib.createGunzip();
        res.pipe(gunzip);
        res = gunzip;
      }
      res.on('data', buff.push.bind(buff));
      res.once('end', () => {
        let data = Buffer.concat(buff).toString();
        try {
          data = JSON.parse(data);
        } catch (e) {}
        res.data = data;
        resolve(res);
      });
    });

    req.on('error', async () => {
      if (opts.awaitInternet && !await exports.checkConnectivity()) {
        console['log']('helpers.request: waiting for internet');
        await exports.awaitInternet();
        return resolve(exports.request(opts));
      }
      resolve({ statusCode: -1 });
    });

    if (body)
      req.write('object' === typeof body ? JSON.stringify(body) : body);

    req.end();
  });
};

exports.fetchIpAddress = async function () {
  return exports.request({ method: 'GET', hostname: 'checkip.amazonaws.com', port: 443, path: '/' }).then(res => {
    const { statusCode, data } = res;
    if (200 !== statusCode) throw new Error('helpers.fetchIpAddress: request error, http('+statusCode+')');
    return data.trim();
  });
};

exports.checkConnectivity = function () {
  return new Promise(r => {
    const client = http2.connect('http://ankama.com');
    client.once('error', () => {
      client.destroy();
      r(false);
    });
    client.once('connect', () => {
      client.destroy();
      r(true);
    });
  });
};

exports.awaitInternet = function (interval = 4e3) {
  return new Promise(r => {
    const check = () => {
      exports.checkConnectivity().then(isOnline => {
        if (isOnline) {
          clearInterval(retryIntervalId);
          r(true);
        }
      });
    };
    const retryIntervalId = setInterval(check, interval);
    check();
  });
};

const SECOND_MILLISECONDS = 1e3;
const MINUTE_MILLISECONDS = 60*SECOND_MILLISECONDS;
const HOUR_MILLISECONDS = 60*MINUTE_MILLISECONDS;
const DAY_MILLISECONDS = 24*HOUR_MILLISECONDS;

const DURATION_FORMAT_TYPES = [
  [DAY_MILLISECONDS, ' day'],
  [HOUR_MILLISECONDS, ' hour'],
  [MINUTE_MILLISECONDS, ' minute'],
  [SECOND_MILLISECONDS, ' second'],
  [1, 'ms'],
  // [.001, 'µs'],
  // [.000001, 'ns']
];

exports.formatDuration = function (milliseconds) {
  let ms = milliseconds;
  if (null === ms || 'number' !== typeof ms || Number.isNaN(ms) || 0 > ms)
    return 'unknown duration';

  const result = [];

  for (let i = 0, member, value, label; DURATION_FORMAT_TYPES.length > i; ++i) {
    member = DURATION_FORMAT_TYPES[i];
    value = ~~(ms/member[0]);
    label = member[1];

    if (value) {
      ms -= member[0]*value;
      if (2 === result.push(value+label+(value > 1 && 2 < label.length ? 's' : '')))
        break;
    }
  }

  return result.length ? result.join(', ') : 'nothing!';
};

exports.probabilityCallback = function (percentage, callback, ...args) {
  percentage = parseInt(percentage);
  if (!Number.isInteger(percentage) || 100 < percentage || 0 > percentage) {
    throw new Error(
      format(
        'helpers.probabilityCallback() : Arguement #1 (percentage) must be in the range from 0% to 100%, %d% is given',
        percentage
      )
    );
  }
  const array = new Array(100-percentage);
  for (let i = 0; percentage > i; ++i) {
    array.push(true);
  }
  exports.shuffle(array);
  return exports.arrayRand(array) && callback(...args);
};

exports.ucfirst = function (...args) {
  if (1 !== args.length) {
    throw new Error(
      format(
        'helpers.ucfirst: Expects exactly 1 argument, %d is given.',
        args.length
      )
    );
  }
  const input = args.shift();
  if ('string' === typeof input && input.length) {
    return input[0].toUpperCase()+input.slice(1);
  }
  return input;
};

exports.toKebabCase = function (string) {
  return string.toLowerCase().replace(/[^\w\s\-]/ig, '').replace(/[^\w\-]/ig, '-');
};

exports.wait = function (min, max) {
  if (void 0 === min || Infinity === min) {
    min = 2147483647;
  } else if (Array.isArray(min)) {
    [min, max] = min;
  }
  const milliseconds = void 0 !== max ? exports.rand(min, max) : min;
  return new Promise(resolve => setTimeout(() => resolve(milliseconds), milliseconds));
};

exports.rand = function (min, max) {
  return Math.round(min+(max-min)*Math.random());
};

exports.randFloat = function (min, max) {
  return Math.round((min+(max-min)*Math.random())*100)/100;
};

exports.arrayRand = function (candidates) {
  return candidates[Math.floor(candidates.length*Math.random())];
};


exports.getTime = function (seconds = false, milliseconds = false) {
  const t = new Date();
  const f = n => ('0'+n).slice(-2);
  const fms = n => ('000'+n).slice(-4);

  let result = format('%s:%s', f(t.getHours()), f(t.getMinutes()));

  seconds && (result += format(':%s', f(t.getSeconds())));
  milliseconds && (result += format('.%s', fms(t.getMilliseconds())));
  return result;
};

exports.randomizer = function (candidate, ...extraCandidates) {
  let totalPercentage = 0, chance = 0, value;

  const roulette = [];
  const candidates = Array.isArray(candidate) ? candidate : [candidate, ...extraCandidates];

  candidates.forEach(candidate => {
    [chance, value] = candidate;
    chance = parseInt(chance);
    if (!Number.isInteger(chance) || 0 > chance || 100 < chance) {
      throw new Error(format('helpers.randomizer: Expects a percentage in the range from 1% to 99%, %s is given.', chance));
    }
    totalPercentage += chance;
    for (let i = 0; chance > i; ++i) {
      roulette.push(value);
    }
  });
  if (100 !== totalPercentage) {
    throw new Error(format('helpers.randomizer: Expects the total percentage to be 100, %d is given.', totalPercentage));
  }
  exports.shuffle(roulette);
  const rand = Math.floor(roulette.length * Math.random());
  return roulette[rand];
};

exports.shuffle = function (arr) {
  for (let i = 0, ri, te, te2; i < arr.length; i++) {
    ri = Math.floor(arr.length * Math.random());
    te = arr[i];
    te2 = arr[ri];
    arr[i] = te2;
    arr[ri] = te;
  }
  return arr;
};

exports.randomString = function (length, numbers = true) {
  let characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';

  if (numbers) characters += '0123456789';
  
  for (let i = 0; i < length; i++)
    result += characters.charAt(Math.floor((Math.random()*characters.length)));
  
  return result;
};

// monkeypatching start
Object.prototype.has = Object.prototype.hasOwnProperty;

Array.prototype.shuffle = function () {
  for (let i = 0, s = this.length, rand = exports.rand, r; i < s; i++) {
    r = rand(0, s-1);
    [this[i], this[r]] = [this[r], this[i]];
  }
  return this;
};

Map.prototype._get = Map.prototype.get;
Map.prototype.get = function (key, orSetValue) {
  return this._get(key) ?? (this.set(key, orSetValue), orSetValue);
};

Map.prototype.increment = function (key, by = 1) {
  let val = this.get(key);
  if (void 0 !== val) {
    val += by;
    this.set(key, val);
  }
  return val;
};

Map.prototype.decrement = function (key, by = 1) {
  let val = this.get(key);
  if (void 0 !== val) {
    val -= by;
    this.set(key, val);
  }
  return val;
};

Map.prototype.pull = function (key) {
  const value = this.get(key);
  return this.delete(key), value;
};

Map.prototype._timers = new Map();
Map.prototype.remember = function (key, value, milliseconds) {
  const { _timers } = this;
  clearTimeout(_timers.get(key));
  _timers.set(key, setTimeout(this.delete.bind(this), milliseconds, key));
  this.set(key, value);
};
// monkeypatching end