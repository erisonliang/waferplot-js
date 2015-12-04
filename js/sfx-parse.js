
var list_tonumber = function(row) {
    for (var i = 0; i < row.length; i++) {
        var x = Number(row[i]);
        if (!isNaN(x) && row[i] !== "") {
            row[i] = x;
        }
    }
};

var is_list_of_numbers = function(row) {
    for (var i = 0; i < row.length; i++) {
        if (typeof(row[i]) !== "number") return false;
    }
    return true;
}

var csvLineSplit = function(line, sep) {
    var row = line.replace("\r", "").split(sep);
    if (row.length > 0 && row[row.length - 1].match(/^\s*$/)) {
        row.pop();
    }
    return row;
}

var findListSeparator = function(line) {
    var row_comma = csvLineSplit(line, ",");
    if (row_comma.length >= 2) {
        return ",";
    }
    var row_semi = csvLineSplit(line, ";");
    if (row_semi.length >= 2) {
        return ";";
    }
    throw "unknown format";
}

var csvReader = function(text) {
    var lines = text.split("\n");
    var i = 0;
    if (lines.length == 0) {
        throw "file is empty";
    }
    var sep = findListSeparator(lines[0]);
    var next = function() {
        if (i < lines.length) {
            var row = csvLineSplit(lines[i++], sep);
            list_tonumber(row);
            return row;
        }
    }
    return {next: next};
};

var generalTags = ['RECIPE', 'MEAS SET', 'SITE', 'SLOT'];

var collectTag = function(tag) {
    return generalTags.indexOf(tag) >= 0;
};

var tagsDoMatch = function(tagList, a, b) {
    for (var k = 0; k < tagList.length; k++) {
        var key = tagList[k];
        if (a[key] !== b[key]) {
            return false;
        }
    }
    return true;
};

var not_empty_string = function(s) {
    var ere = /^\s*$/;
    return (ere.exec(s) === null);
}

var clean_csv_string = function(s) {
    if (typeof(s) == "string") {
        s = s.replace(/^\s*"?/, "");
        return s.replace(/"?\s*$/, "");
    } else {
        return s;
    }
}

var complete_headers = function(headers) {
    headers[0] = "Site";
    headers.push("X");
    headers.push("Y");
};

FXParser = function(text, options) {
    this.reader = csvReader(text);
    this.measSections = (options && options.sections) ? options.sections : [];
};

FXParser.tablesDoMatch = function(ta, tb) {
    return tagsDoMatch(generalTags, ta.info, tb.info);
};

FXParser.prototype = {
    readDateTime: function() {
        for (var row = this.next(); row; row = this.next()) {
            if (!row[0]) break;
            if (row[0].indexOf('COLLECTION DATE/TIME:') >= 0) {
                if (row.length > 1) {
                    var datere = /(\d+)\/(\d+)\/(\d+)\s+(\d+):(\d+):(\d+)/;
                    var m = datere.exec(row[1]);
                    if (m) {
                        var sec = Number(m[6]) + Number(m[5])*60 + Number(m[4]) * 3600 + Number(m[2]) * 24 * 3600;
                        return sec / 3600;
                    }
                }
            }
        }
        return 0;
    },

    readMeasurements: function(headers) {
        var meas = [];
        for (var row = this.next(); row; row = this.next()) {
            if (!row[0]) break;
            if (is_list_of_numbers(row)) {
                meas.push(row);
            }
        }
        return meas;
    },

    appendSection: function(info, meas, headers) {
        var resultHeaders = headers.slice(1, headers.length - 2);
        var table = DataFrame.create(meas, headers);
        this.measSections.push({info: info, table: table, resultHeaders: resultHeaders});
    },

    readSection: function(measInfo) {
        var info = {TOOL: measInfo.tool, TIME: measInfo.time};
        var headers;
        for (var row = this.next(); row; row = this.next()) {
            var key = row[0];
            if (key === "RESULT TYPE") {
                headers = row.filter(not_empty_string).map(clean_csv_string);
            } else if (collectTag(key)) {
                info[key] = clean_csv_string(row[1]);
            } else if (key == "Site #") {
                complete_headers(headers);
                var meas = this.readMeasurements(headers);
                this.appendSection(info, meas, headers);
                return true;
            }
        }
        return false;
    },

    readAll: function(measInfo) {
        while (this.readSection(measInfo)) { }
    },

    next: function() { return this.reader.next(); }
};
