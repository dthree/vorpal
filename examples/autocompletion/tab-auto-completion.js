

const fs = require('fs');
const path = require('path');
const vorpal = require('vorpal')();

vorpal.command('run [file]')
.description('run a single test script')
.autocomplete({
  data: function (input, cb) {

  const basename = path.basename(input);
  const dir = path.dirname(path.resolve(process.cwd() + `/${input}`));

  fs.readdir(dir, function (err, items) {
    if (err) {
      return cb(null);
    }
    const matches = items.filter(function (item) {
      return String(item).match(basename);
    });

    return cb(matches);   // vorpal handles autocompletion for you, just pass back the matches

  });

}
});
