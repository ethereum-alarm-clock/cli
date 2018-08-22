const glob = require('glob');
const fs = require('fs');

const delFile = file => {
  fs.unlink(file, (err) => {
    const msg = err ? ` - ${err.message}.` : ' - deleted.';
    console.log(file + msg);
  });
};

glob("stats.json*", (err, files) => {
  for (let file of files) {
    delFile(file);
  }
});

delFile('scheduled.txt');

glob(".eac.log*", (err, files) => {
  for (let file of files) {
    delFile(file);
  }
});