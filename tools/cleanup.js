const glob = require('glob');
const fs = require('fs');

const delFile = file => {
  fs.unlink(file, (err) => {
    if (err) throw err;
    console.log(`${file} was deleted.`);
  });
};

glob("stats.json*", (err, files) => {
  for (let file of files) {
    delFile(file);
  }
});

delFile('scheduled.txt');
delFile('.eac.log');