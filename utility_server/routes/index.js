var express = require('express');
var router = express.Router();
var fs = require('fs');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.post('/', function (req, res, next) {
  console.log('got it');
  global.req = req;
});

function writeBinary(arrayBody, outputFile = 'starPositions.bin') {
  const stream = fs.createWriteStream(outputFile, { encoding: 'binary' });
  stream.write(Buffer.from(Uint8Array.from(arrayBody).buffer));
  stream.end();
}

module.exports = router;
