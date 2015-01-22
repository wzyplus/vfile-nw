var fs = require('fs');
var path = require('path');


var BASE_DIR = './format';

function chooseFile(name, label) {
  var chooser = $(name);
  chooser.change(function(evt) {
    $(label).text($(this).val());
    $(label).val($(this).val());
  });
  chooser.click();
}

function getFiles(dir) {
  files_ = [];
  var files = fs.readdirSync(dir);
  $.each(files, function(index, value) {
    if (!fs.statSync(dir + '/' + value).isDirectory()
        && path.extname(value) === '.json') {
      files_.push(path.basename(value, '.json'));
    }
  });
  return files_;
}

function addSelectOption(name, opts) {
  var sel = $(name);
  $.each(opts, function(index, value) {
    sel.append($('<option></option>').attr('value', value).text(value));
  });
}

function loadFormat(format, callback) {
  fs.readFile(path.join(BASE_DIR, format + '.json'), 'utf-8',
    function(err, data) {
    if (err) {
      alert(err);
    } else {
      try {
        callback(JSON.parse(data));
      } catch (ex) {
        alert(ex);
      }
    }
  });
}

function parseData(type, chunk, start, end) {
  switch (type) {
    case 'string':
      return chunk.toString('ascii', start, end);
    case 'binary':
      return chunk.toString('hex', start, end).toUpperCase();
    default:
      return '';
  }
}

function buildParseResult(rule) {
  var res = { head_column: [], head_data: [], head_length: 0,
              body_column: [], body_data: [], record_length: 0,
              code: 0};

  if (rule.head) {
    for (var i in rule.head) {
      res.head_column.push(rule.head[i].name);
      res.head_length += rule.head[i].length;
    }
  }
  
  if (rule.body) {
    for (var i in rule.body) {
      res.body_column.push(rule.body[i].name);
      res.record_length += rule.body[i].length;
    }
  }
  return res;
}

function parseFileContent(buffer, rule) {
  var res = buildParseResult(rule);
  var left = buffer.length;
  var done = 0;
  var flen = 0;

  // parse head
  if (rule.head) {
    var record = [];
    for (var i in rule.head) {
      flen = rule.head[i].length;
      if (left < flen) {
        res.code = 1;
        res.head_data.push(record);
        return res;
      }

      record.push(parseData(rule.head[i].type,
                            buffer,
                            done, done + flen));
      done += flen;
      left -= flen;
    }
    res.head_data.push(record);
  }
  
  if (rule.body) {
    // parse body
    while (left > 0) {
      var record = [];
      for (var i in rule.body) {
        flen = rule.body[i].length;
        if (left < flen) {
          res.code = 1;
          res.body_data.push(record);
          return res;
        }

        record.push(parseData(rule.body[i].type,
                              buffer,
                              done, done + flen));
        done += flen;
        left -= flen;
      }
      res.body_data.push(record);
    }
  }
  return res;
}

function parseFile(file, format, callback) {
  loadFormat(format, function(rule) {
    var buffer = [];
    var nread = 0;

    var readable = fs.createReadStream(file, {flags: 'r', autoClose: true});
    readable.on('data', function(chunk) {
      buffer.push(chunk);
      nread += chunk.length;
    });

    readable.on('end', function() {
      buffer = Buffer.concat(buffer, nread);
      callback(parseFileContent(buffer, rule));
    });
  });
}

setTableData = function (table, header, data, hasIndex) {
  var hasIndex = hasIndex || false;

  $(table).empty();

  var tblHeader = "<thead><tr>";
  if (hasIndex) {
    tblHeader += "<th>" + '#' + "</th>";
  }
  $.each(header, function(index, value) {
    tblHeader += "<th>" + value + "</th>";
  });
  tblHeader += "</tr></thead>";
  $(tblHeader).appendTo(table);

  var rowIndex = 1;
  $.each(data, function (index, value) {
    var row = "<tr>";
    if (hasIndex) {
      row += "<td>" + rowIndex + "</td>";
      rowIndex++;
    }
    $.each(value, function (key, val) {
      if (val.indexOf(' ') > -1) {
        row += '<td class="info">' + val.replace(/ /g, '&nbsp') + "</td>";
      } else {
        row += "<td>" + val + "</td>";
      }
    });
    row += "</tr>";
    $(table).append(row);
  });
};