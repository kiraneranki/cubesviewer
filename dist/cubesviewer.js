/*
 * angular-bootstrap-submenu
 * Copyright (c) 2016 Jose Juan Montes
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * If your version of the Software supports interaction with it remotely through
 * a computer network, the above copyright notice and this permission notice
 * shall be accessible to all users.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */


/* 'use strict'; */


angular.module('bootstrapSubmenu', []).directive("submenu", ['$timeout', function($timeout) {
	return {
		restrict: 'A',
		link: function(scope, iElement, iAttrs) {
			// FIXME: This is not a proper way of waiting for the menu to be constructed.
			$timeout(function() {
				$(iElement).submenupicker();
			}, 500);
		}
	};
}]);

;/* Cubes.js
 *
 * JavaScript library for Cubes OLAP.
 *
 */

(function(){

    // Light-weight "underscore" replacements

    var _ = {};

    _.map = function(ary, f) {
      var ret = [];
      for (var i = 0; i < ary.length; i++) {
        ret.push(f(ary[i]));
      }
      return ret;
    };

    _.filter = function(ary, f) {
      var ret = [];
      for (var i = 0; i < ary.length; i++) {
        if ( f(ary[i]) ) ret.push(ary[i]);
      }
      return ret;
    };

    _.find = function(ary, f) {
      var i;
      if (Object.prototype.toString.call(ary) === '[object Array]') {
        for (i = 0; i < ary.length; i++) {
          if ( f(ary[i]) ) return ary[i];
        }
      } else {
        for (i in ary) {
          if ( f(ary[i]) ) return ary[i];
        }
      }
      return null;
    };

    _.indexOf = function(ary, f) {
      var i;
      if (Object.prototype.toString.call(ary) === '[object Array]') {
        for (i = 0; i < ary.length; i++) {
          if ( f(ary[i]) ) return i;
        }
      } else {
        for (i in ary) {
          if ( f(ary[i]) ) return i;
        }
      }
      return -1;
    };

    _.isObject = function(o) {
      return Object.prototype.toString.call(o) === '[object Object]';
    };

    _.isString = function(o) {
      return Object.prototype.toString.call(o) === '[object String]';
    };

    // Variables and functions go here.
    var root = this;
    var cubes = { };

    /*
     * Server
     * ======
     */

    cubes.Server = function(ajaxHandler){
        // Represents Cubes Slicer Server connection.
        //
        // Attributes:
        //
        // * `ajaxHandler`: a function accepting jquery-style settings object as in $.ajax(settings)
        //

        if(ajaxHandler)
        {
            this.ajaxRequest = ajaxHandler;
        }
        else
        {
            this.ajaxRequest = $.ajax;
        }
        this._cube_list = [];
        this._cubes = {}
    };

    cubes.Server.prototype.cubeinfo = function(cubename) {
    	cubeinfos = $.grep(this._cube_list, function (ci) { return ci.name == cubename });
    	if (cubeinfos.length != 1) throw "Found " + cubeinfos.length + " cubes with name '" + cubename + "' in the cube list";
    	return cubeinfos[0];
    };
    
    cubes.Server.prototype.ajaxRequest = function(settings) {
        throw "Must implement ajaxRequest for server to process jquery-style $.ajax settings object";
    };

    cubes.Server.prototype.query = function(query, cube, args, callback, errCallback, completeCallback) {
        var params = {dataType : 'json', type : "GET"};

        if(cube.hasOwnProperty("name"))
            cube_name = cube.name;
        else
            cube_name = cube;

        params.url = this.url + "cube/" + cube_name + "/" + query;
        params.data = args;

        if(args && args.cut)
            params.data.cut = params.data.cut.toString();

        if(args && args.drilldown)
          params.data.drilldown = params.data.drilldown.toString();

        params.success = function(obj) {
            callback(obj);
        };
        params.error = function(obj) {
            // FIXME: Some error handler here
            if (errCallback) errCallback(obj);
        };
        params.complete = function(obj) {
            if (completeCallback) completeCallback(obj);
        };

        return this.ajaxRequest(params);
    };

    /**
     * Connect to the Slicer server.
     *
     * @param {url} Slicer server URL
     * @param {callback} Function called on successfull connect
     * @param {errCallback} Function called on error
     *     one line.
     */
    
    cubes.Server.prototype.connect = function(url, callback, errCallback) {
        var self = this;

        self.url = self._normalize_url(url);

        var options = {dataType : 'json', type : "GET"};

        options.url = self.url + 'info';

        options.success = function(resp, status, xhr) {
            self.server_version = resp.cubes_version;
            self.cubes_version = resp.cubes_version;
            self.api_version = resp.api_version;
            self.info = resp;
            self.load_cube_list(callback, errCallback);
        };

        options.error = function(resp, status, xhr) {
            if (errCallback)
                errCallback(resp);
        };

        this.ajaxRequest(options);
    };

    cubes.Server.prototype._normalize_url = function(url) {
        if(url[url.length-1] != '/')
            return url + '/';
        return url;
    };

    cubes.Server.prototype.load_cube_list = function(callback, errCallback) {
        var self = this;

        var options = {dataType : 'json', type : "GET"};

        options.url = self.url + 'cubes';

        options.success = function(resp, status, xhr) {
            self._cube_list = resp;

            if (callback)
                callback(self._cube_list);
        };

        options.error = function(resp, status, xhr) {
            if (errCallback)
                errCallback(resp);
        };

        return this.ajaxRequest(options);
    };

    cubes.Server.prototype.get_cube = function(name, callback, errCallback) {
        var self = this;

        // Return the cube if already loaded
        if((name in this._cubes) && callback){
            callback(this._cubes[name]);
            return null;
        }
            
        var options = {dataType : 'json', type : "GET"};

        options.url = self.url + 'cube/' + encodeURI(name) + '/model';

        options.success = function(resp, status, xhr) {
            // must parse dimensions first into a "fake" model
            var cube = new cubes.Cube(resp);

            self._cubes[name] = cube;

            // FIXME: handle model parse failure
            if (callback)
                callback(cube);
        };

        options.error = function(resp, status, xhr) {
            if (errCallback)
                errCallback(resp);
        };

        return this.ajaxRequest(options);
    };

    /*
     * The Cube
     * ========
     */

    cubes.Cube = function(metadata) {
        var i, obj;

        this.name = metadata.name;
        !metadata.label || (this.label = metadata.label);
        !metadata.description || (this.description = metadata.description);
        !metadata.key || (this.key = metadata.key);
        !metadata.info || (this.info = metadata.info);
        !metadata.category || (this.category = metadata.category);
        !metadata.features || (this.features = metadata.features);

        this.measures = _.map(metadata.measures || [], function(m) { return new cubes.Measure(m); });
        this.aggregates = _.map(metadata.aggregates || [], function(m) { return new cubes.MeasureAggregate(m); });
        this.details = _.map(metadata.details || [], function(m) { return new cubes.Attribute(m); });

        this.dimensions = _.map(metadata.dimensions || [], function(dim) {return new cubes.Dimension(dim);} );
    };

    cubes.Cube.prototype.dimension = function(name) {
        if ( _.isObject(name) )
          return name;
        // Return a dimension with given name
        return _.find(this.dimensions, function(obj){return obj.name === name;});
    };

    /*
     * Dimension
     * =========
     */

    cubes.Dimension = function(md){
        var dim = this;
        var i;

        dim.name = md.name;
        !md.label || (dim.label = md.label);
        !md.description || (dim.description = md.description);
        !md.default_hierarchy_name || (dim.default_hierarchy_name = md.default_hierarchy_name);
        !md.info || (dim.info = md.info);
        !md.role || (dim.role = md.role);
        !md.cardinality || (dim.cardinality = md.cardinality);
        !md.nonadditive || (dim.nonadditive = md.nonadditive);

        dim.levels = [];

        if(md.levels) {
            for(i in md.levels) {
                var level = new cubes.Level(dim.name, md.levels[i]);
                dim.levels.push(level);
            }
        }

        this.hierarchies = {};

        if(md.hierarchies) {
            for(i in md.hierarchies) {
                var hier = new cubes.Hierarchy(md.hierarchies[i], this);
                dim.hierarchies[hier.name] = hier;
            }
        }

        // if no default_hierarchy_name defined, use first hierarchy's name.
        if ( ! dim.default_hierarchy_name && md.hierarchies
                    && md.hierarchies.length > 0 ) {
          dim.default_hierarchy_name = md.hierarchies[0].name;
        }
    };

    cubes.Dimension.prototype.hierarchy = function(name) {
        if ( _.isObject(name) ) 
          return name;
        if ( ! name ) {
          return this.hierarchies[this.default_hierarchy_name];
        }
        // Return a hierarchy with given name
        return this.hierarchies[name];
    }

    cubes.Dimension.prototype.level = function(name) {
        if ( _.isObject(name) ) 
          return name;
        // Return a level with given name
        return _.find(this.levels, function(obj) {return obj.name == name;});
    };

    cubes.Dimension.prototype.toString = function(desc) {
        return this.name;
    };

    cubes.Dimension.prototype.display_label = function() {
        return this.label || this.name;
    };

    cubes.Dimension.prototype.hierarchy = function(name) {
        if ( _.isObject(name) ) 
          return name;
        else if(name != null)
            return this.hierarchies[name];
        else
            return this.hierarchies[this.default_hierarchy_name];
    };

    /*
     * Hierarchy
     * ---------
     */

    cubes.Hierarchy = function(obj, dim) {
        this.parse(obj, dim);
    };

    cubes.Hierarchy.prototype.parse = function(desc, dim) {
        var hier = this;
        var i;

        hier.name = desc.name;
        !desc.label || (hier.label = desc.label)
        !desc.description || (hier.description = desc.description)
        !desc.info || (hier.info = desc.info);

        var level_names = desc.levels || [];

        hier.levels = _.map(level_names, function(name) {return dim.level(name);} );
    };

    cubes.Hierarchy.prototype.toString = function() {
        return cubes.HIERARCHY_PREFIX_CHAR + this.name;
    };

    cubes.Hierarchy.prototype.display_label = function() {
        return this.label || this.name;
    };

    /*
     * Level
     * -----
     */

    cubes.Level = function(dimension_name, obj){
        this.parse(dimension_name, obj);
    };

    cubes.Level.prototype.parse = function(dimension_name, desc) {
        var level = this;
        var i;

        level.dimension_name = dimension_name;
        level.name = desc.name;
        !desc.label || (level.label = desc.label);
        !desc.description || (level.description = desc.description);
        !desc.info || (level.info = desc.info);
        level._key = desc.key;
        level._label_attribute = desc.label_attribute;
        level._order_attribute = desc.order_attribute;
        !desc.role || (level.role = desc.role);
        !desc.cardinality || (level.cardinality = desc.cardinality);
        level.nonadditive = desc.nonadditive;

        level.attributes = [];

        if(desc.attributes) {
            for(i in desc.attributes) {
                var attr = new cubes.Attribute(desc.attributes[i]);
                level.attributes.push(attr);
            }
        }
    };

    cubes.Level.prototype.key = function() {
        // Key attribute is either explicitly specified or it is first attribute in the list
        var key = this._key;
        the_attr = _.find(this.attributes, function(a) { return a.name === key; });
        return the_attr || this.attributes[0];
    };

    cubes.Level.prototype.label_attribute = function() {
        // Label attribute is either explicitly specified or it is second attribute if there are more
        // than one, otherwise it is first
        var the_attr = null;
        if ( this._label_attribute ) {
            var label_attribute = this._label_attribute;
            the_attr = _.find(this.attributes, function(a) { return a.name === label_attribute; });
        }
        return the_attr || this.key();
    };

    cubes.Level.prototype.order_attribute = function() {
        var the_attr = null;
        if ( this._order_attribute ) {
          the_attr = _.find(this.attributes, function(a) { a.name === this.__order_attribute; });
        }
        return the_attr || this.key();
    };

    cubes.Level.prototype.toString = function() {
        return this.name;
    };

    cubes.Level.prototype.display_name = function() {
      return this.label || this.name;
    };

    cubes.Level.prototype.full_name = function() {
        return this.dimension_name + cubes.ATTRIBUTE_STRING_SEPARATOR_CHAR + this.name;
    };

    cubes.Level.prototype.full_name_for_drilldown = function() {
        return this.dimension_name + cubes.DIMENSION_STRING_SEPARATOR_CHAR + this.name;
    };


    /*
     * Attributes, measures and measure aggregates
     * -------------------------------------------
     * */

    cubes.Attribute = function(obj){
        this.ref = obj.ref;
        this.name = obj.name;
        this.label = obj.label;
        this.order = obj.order;
        this.info = (obj.info || {});
        this.description = obj.description;
        this.format = obj.format;
        this.missing_value = obj.missing_value;
        this.locales = obj.locales;
    };

    cubes.Measure = function(obj){
        this.ref = obj.ref;
        this.name = obj.name;
        this.label = obj.label;
        this.order = obj.order;
        this.info = (obj.info || {});
        this.description = obj.description;
        this.format = obj.format;
        this.missing_value = obj.missing_value;
        this.nonadditive = obj.nonadditive;
        if (obj.aggregates) {
            this.aggregates = obj.aggregates;
        }
    };
    cubes.MeasureAggregate = function(obj){
        this.ref = obj.ref;
        this.name = obj.name;
        this.label = obj.label;
        this.order = obj.order;
        this.locales = obj.locales;
        this.info = (obj.info || {});
        this.description = obj.description;
        this.format = obj.format;
        this.missing_value = obj.missing_value;
        this.nonadditive = obj.nonadditive;

        this["function"] = obj["function"];
        this.measure = obj.measure;
    };


    /*
     * Browser 
     * =======
     * */

    cubes.Browser = function(server, cube){
        this.cube = cube;
        this.server = server;
    };

    cubes.Browser.prototype.full_cube = function() {
        return new cubes.Cell(this.cube);
    };

    cubes.Browser.prototype.aggregate = function(args, callback) {
        if ( ! args )
          args = {};

        var http_args = {};

        if (args.cut) http_args.cut = args.cut.toString();
        if (args.measure) http_args.measure = args.measure.toString();
        if (args.drilldown) http_args.drilldown = args.drilldown.toString();
        if (args.split) http_args.split = args.split.toString();
        if (args.order) http_args.order = args.order.toString();
        if (args.page) http_args.page = args.page;
        if (args.pagesize) http_args.pagesize = args.pagesize;

        return this.server.query("aggregate", this.cube, args, callback);
    };
    
    cubes.Browser.prototype.facts = function(args, callback) {
        if ( ! args )
          args = {};

        var http_args = {};

        if (args.cut) http_args.cut = args.cut.toString();
        if (args.order) http_args.order = args.order.toString();
        if (args.page) http_args.page = args.page;
        if (args.pagesize) http_args.pagesize = args.pagesize;

        return this.server.query("facts", this.cube, args, callback);
    };    

    cubes.Drilldown = function(dimension, hierarchy, level) {
        if ( ! _.isObject(dimension) )
            throw "Drilldown requires a Dimension object as first argument";
        this.dimension = dimension;
        this.hierarchy = dimension.hierarchy(hierarchy);
        this.level = dimension.level(level) || this.hierarchy.levels[0];
        if ( ! this.hierarchy ) 
            throw "Drilldown cannot recognize hierarchy " + hierarchy + " for dimension " + dimension;
        if ( ! this.level ) 
            throw "Drilldown cannot recognize level " + level  + " for dimension " + dimension;
    };

    cubes.Drilldown.prototype.toString = function() {
        return "" + this.dimension + this.hierarchy + cubes.DIMENSION_STRING_SEPARATOR_CHAR + this.level;
    };

    cubes.Drilldown.prototype.keysInResultCell = function() {
        var drill = this;
        var saw_this_level = false;
        var levels_to_look_for = _.filter(drill.hierarchy.levels, function(lvl) { return ( lvl.key() === drill.level.key() && (saw_this_level = true) ) || ( ! saw_this_level ); });
        return _.map(levels_to_look_for, function(lvl) { return lvl.key().ref });
    }

    cubes.Drilldown.prototype.labelsInResultCell = function() {
        var drill = this;
        var saw_this_level = false;
        var levels_to_look_for = _.filter(drill.hierarchy.levels, function(lvl) { return ( lvl.key() === drill.level.key() && (saw_this_level = true) ) || ( ! saw_this_level ); });
        return _.map(levels_to_look_for, function(lvl) { return lvl.label_attribute().ref });
    }

    cubes.Cell = function(cube, cuts) {
        this.cube = cube;
        this.cuts = _.map((cuts || []), function(i) { return i; });
    };

    cubes.Cell.prototype.slice = function(new_cut) {
        var cuts = [];
        var new_cut_pushed = false;
        for (var i = 0; i < this.cuts.length; i++) {
          var c = this.cuts[i];
          if ( c.dimension == new_cut.dimension ){
            cuts.push(new_cut);
            new_cut_pushed = true;
          }
          else {
            cuts.push(c);
          }
        }
        if ( ! new_cut_pushed ) {
          cuts.push(new_cut);
        }
        var cell = new cubes.Cell(this.cube, cuts);
        return cell;
    };

    cubes.Cell.prototype.toString = function() {
        return _.map(this.cuts || [], function(cut) { return cut.toString(); }).join(cubes.CUT_STRING_SEPARATOR_CHAR);
    };

    cubes.Cell.prototype.cut_for_dimension = function(name) {
        return _.find(this.cuts, function(cut) {
            return cut.dimension.name == name;
        });
    };

    cubes.PointCut = function(dimension, hierarchy, path, invert) {
        this.type = 'point';
        this.dimension = dimension;
        this.hierarchy = dimension.hierarchy(hierarchy);
        this.path = path;
        this.invert = !!invert;
    };

    cubes.PointCut.prototype.toString = function() {
        var path_str = cubes.string_from_path(this.path);
        return (this.invert ? cubes.CUT_INVERSION_CHAR : "") +
            this.dimension +
            ( this.hierarchy || '' ) +
            cubes.DIMENSION_STRING_SEPARATOR_CHAR +
            path_str;
    };

    cubes.SetCut = function(dimension, hierarchy, paths, invert) {
        this.type = 'set';
        this.dimension = dimension;
        this.hierarchy = dimension.hierarchy(hierarchy);
        this.paths = paths;
        this.invert = !!invert;
    };

    cubes.SetCut.prototype.toString = function() {
        var path_str = _.map(this.paths, cubes.string_from_path).join(cubes.SET_CUT_SEPARATOR_CHAR);
        return (this.invert ? cubes.CUT_INVERSION_CHAR : "") +
            this.dimension +
            ( this.hierarchy || '' ) +
            cubes.DIMENSION_STRING_SEPARATOR_CHAR +
            path_str;
    };

    cubes.RangeCut = function(dimension, hierarchy, from_path, to_path, invert){
        this.type = 'range';
        this.dimension = dimension;
        this.hierarchy = dimension.hierarchy(hierarchy);
        if ( from_path === null && to_path === null ) {
            throw "Either from_path or to_path must be defined for RangeCut";
        }
        this.from_path = from_path;
        this.to_path = to_path;
        this.invert = !!invert;
    };

    cubes.RangeCut.prototype.toString = function() {
        var path_str = cubes.string_from_path(this.from_path) + cubes.RANGE_CUT_SEPARATOR_CHAR + cubes.string_from_path(this.to_path);
        return (this.invert ? cubes.CUT_INVERSION_CHAR : "") +
            this.dimension +
            ( this.hierarchy || '' ) +
            cubes.DIMENSION_STRING_SEPARATOR_CHAR +
            path_str;
    };

    cubes.CUT_INVERSION_CHAR = "!";
    cubes.CUT_STRING_SEPARATOR_CHAR = "|";
    cubes.DIMENSION_STRING_SEPARATOR_CHAR = ":";
    cubes.ATTRIBUTE_STRING_SEPARATOR_CHAR = ".";
    cubes.HIERARCHY_PREFIX_CHAR = "@";
    cubes.PATH_STRING_SEPARATOR_CHAR = ",";
    cubes.RANGE_CUT_SEPARATOR_CHAR = "-";
    cubes.SET_CUT_SEPARATOR_CHAR = ";";

    cubes.CUT_STRING_SEPARATOR = /\|/g;
    cubes.DIMENSION_STRING_SEPARATOR = /:/g;
    cubes.PATH_STRING_SEPARATOR = /,/g;
    cubes.RANGE_CUT_SEPARATOR = /-/g;
    cubes.SET_CUT_SEPARATOR = /;/g;

    cubes.PATH_PART_ESCAPE_PATTERN = /([\\!|:;,-])/g;
    cubes.PATH_PART_UNESCAPE_PATTERN = /\\([\\!|:;,-])/g;

    cubes.CUT_PARSE_REGEXP = new RegExp("^(" + cubes.CUT_INVERSION_CHAR + "?)(\\w+)(?:" + cubes.HIERARCHY_PREFIX_CHAR + "(\\w+))?" + cubes.DIMENSION_STRING_SEPARATOR_CHAR + "(.*)$")
    cubes.DRILLDOWN_PARSE_REGEXP = new RegExp("^(\\w+)(?:" + cubes.HIERARCHY_PREFIX_CHAR + "(\\w+))?(?:" + cubes.DIMENSION_STRING_SEPARATOR_CHAR + "(\\w+))?$")
    cubes.NULL_PART_STRING = '__null__';
    cubes.SPLIT_DIMENSION_STRING = '__within_split__';

    cubes.SPLIT_DIMENSION = new cubes.Dimension({
      name: cubes.SPLIT_DIMENSION_STRING, 
      label: 'Matches Filters', 
      hierarchies: [ { name: 'default', levels: [ cubes.SPLIT_DIMENSION_STRING ] } ],
      levels: [ { name: cubes.SPLIT_DIMENSION_STRING, attributes: [{name: cubes.SPLIT_DIMENSION_STRING}], label: 'Matches Filters' } ] 
    });

    cubes._split_with_negative_lookbehind = function(input, regex, lb) {
      var string = input;
      var match;
      var splits = [];
      
      
      while ((match = regex.exec(string)) != null) {
          if ( string.substr(match.index - lb.length, lb.length) != lb ) {
            splits.push(string.substring(0, match.index));
            string = string.substring(Math.min(match.index + match[0].length, string.length));
            regex.lastIndex = 0;
          }
          else {
            // match has the lookbehind, must exclude
        	// TODO: I suspect an infinite loop on this branch as the string is not modified
          }
      }
      splits.push(string);
      return splits;
    }

    cubes._escape_path_part = function(part) {
        if ( part == null ) {
          return cubes.NULL_PART_STRING;
        }
        return part.toString().replace(cubes.PATH_PART_ESCAPE_PATTERN, function(match, b1) { return "\\" + b1; });
    };

    cubes._unescape_path_part = function(part) {
        if ( part === cubes.NULL_PART_STRING ) {
          return null;
        }
        return part.replace(cubes.PATH_PART_UNESCAPE_PATTERN, function(match, b1) { return b1; });
    };

    cubes.string_from_path = function(path){
        var fixed_path = _.map(path || [], function(element) {return cubes._escape_path_part(element);}).join(cubes.PATH_STRING_SEPARATOR_CHAR);
        return fixed_path;
    };

    cubes.path_from_string = function(path_string) {
        var paths = cubes._split_with_negative_lookbehind(path_string, cubes.PATH_STRING_SEPARATOR, '\\');
        var parsed = _.map(paths || [], function(e) { return cubes._unescape_path_part(e); });
        return parsed;
    };

    cubes.cut_from_string = function(cube_or_model, cut_string) {
        // parse out invert, dim_name, hierarchy, and path thingy
        var match = cubes.CUT_PARSE_REGEXP.exec(cut_string);
        if (!match) {
          return null;
        }
        var invert = !!(match[1]), 
            dim_name = match[2],
            hierarchy = match[3] || null,
            path_thingy = match[4];
        var dimension = cube_or_model.dimension(dim_name);
        // if path thingy splits on set separator, make a SetCut.
        var splits = cubes._split_with_negative_lookbehind(path_thingy, cubes.SET_CUT_SEPARATOR, '\\');
        if ( splits.length > 1 ) {
          return new cubes.SetCut(dimension, hierarchy, _.map(splits, function(ss) { return cubes.path_from_string(ss); }), invert);
        }
        // else if path thingy splits into two on range separator, make a RangeCut.
        splits = cubes._split_with_negative_lookbehind(path_thingy, cubes.RANGE_CUT_SEPARATOR, '\\');
        if ( splits.length == 2 ) {
          var from_path = splits[0] ? cubes.path_from_string(splits[0]) : null;
          var to_path = splits[1] ? cubes.path_from_string(splits[1]) : null;
          return new cubes.RangeCut(dimension, hierarchy, from_path, to_path, invert);
        }
        // else it's a PointCut.
        return new cubes.PointCut(dimension, hierarchy, cubes.path_from_string(path_thingy), invert);
    };

    cubes.cuts_from_string = function(cube_or_model, cut_param_value) {
        var cut_strings = cubes._split_with_negative_lookbehind(cut_param_value, cubes.CUT_STRING_SEPARATOR, '\\');
        return _.map(cut_strings || [], function(e) { return cubes.cut_from_string(cube_or_model, e); });
    };

    cubes.cell_from_string = function(cube, cut_param_value) {
        return new cubes.Cell(cube, cubes.cuts_from_string(cube, cut_param_value));
    };

    cubes.drilldown_from_string = function(cube_or_model, drilldown_string) {
        var match = cubes.DRILLDOWN_PARSE_REGEXP.exec(drilldown_string);
        if (!match) {
          return null;
        }
        var dim_name = match[1], 
            hierarchy = match[2] || null,
            level = match[3] || null;
        var dimension = cube_or_model.dimension(dim_name);
        if ( ! dimension )
          if ( dim_name === cubes.SPLIT_DIMENSION_STRING ) 
            dimension = cubes.SPLIT_DIMENSION;
          else 
            return null;
        return new cubes.Drilldown(dimension, hierarchy, level);
    };

    cubes.drilldowns_from_string = function(cube_or_model, drilldown_param_value) {
        var dd_strings = cubes._split_with_negative_lookbehind(drilldown_param_value, cubes.CUT_STRING_SEPARATOR, '\\');
        return _.map(dd_strings || [], function(e) { return cubes.drilldown_from_string(cube_or_model, e); });
    };

    cubes.drilldowns_to_string = function(drilldowns) {
      return _.map(drilldowns, function(d) { return d.toString(); }).join(cubes.CUT_STRING_SEPARATOR_CHAR);
    };

    root['cubes'] = cubes;

}).call(this);
;/*
 * CubesViewer
 * Copyright (c) 2012-2015 Jose Juan Montes, see AUTHORS for more details
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * If your version of the Software supports interaction with it remotely through
 * a computer network, the above copyright notice and this permission notice
 * shall be accessible to all users.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */


"use strict";

/* Extensions to cubesviewer client lib */
cubes.Dimension.prototype.hierarchies_count = function()  {

	var count = 0;
	for (hiename in this.hierarchies) {
		if (this.hierarchies.hasOwnProperty(hiename)) {
			count++;
		}
	}
	return count;
};

cubes.Dimension.prototype.default_hierarchy = function()  {
	return this.hierarchies[this.default_hierarchy_name];
};

cubes.Cube.prototype.cvdim_dim = function(dimensionString) {
	// Get a dimension by name. Accepts dimension hierarchy and level in the input string.
	var dimname = dimensionString;
	if (dimensionString.indexOf('@') > 0) {
		dimname = dimensionString.split("@")[0];
	} else if (dimensionString.indexOf(':') > 0) {
		dimname = dimensionString.split(":")[0];
	}

	return this.dimension(dimname);
};

cubes.Cube.prototype.cvdim_parts = function(dimensionString) {
	// Get a dimension info by name. Accepts dimension hierarchy and level in the input string.

	var dim = this.cvdim_dim(dimensionString);
	var hie = dim.default_hierarchy();

	if (dimensionString.indexOf("@") > 0) {
		var hierarchyName = dimensionString.split("@")[1].split(":")[0];
		hie = dim.hierarchy(hierarchyName);
	}

	var lev = null;
	if (dimensionString.indexOf(":") > 0) {
		var levelname = dimensionString.split(":")[1];
		lev = dim.level(levelname);
	} else {
		lev = dim.level(hie.levels[0]);
	}

	var depth = null;
	for (var i = 0; i < hie.levels.length; i++) {
		if (lev.name == hie.levels[i]) {
			depth = i + 1;
			break;
		}
	}

	return {
		dimension: dim,
		level: lev,
		depth: depth,
		hierarchy: hie,
		label: dim.label + ( hie.name != "default" ? (" / " + hie.label) : "" ) + ( hie.levels.length > 1 ? (": " + lev.label) : "" ),
		labelNoLevel: dim.label + ( hie.name != "default" ? (" / " + hie.label) : "" ),
		fullDrilldownValue: dim.name + ( hie.name != "default" ? ("@" + hie.name) : "" ) + ":" + lev.name
	};

};

/**
 * Returns the aggregates for the given measure, by name.
 * If passed null, returns aggregates with no measure.
 */
cubes.Cube.prototype.measureAggregates = function(measureName) {
	var aggregates = $.grep(this.aggregates, function(ia) { return measureName ? ia.measure == measureName : !ia.measure; } );
	return aggregates;
};


/*
 * Processes a cell and returns an object with consistent information:
 * o.key
 * o.label
 * o.info[]
 */
cubes.Level.prototype.readCell = function(cell) {

	if (!(this.key().ref in cell)) return null;

	var result = {};
	result.key = cell[this.key().ref];
	result.label = cell[this.label_attribute().ref];
	result.info = {};
	$(this.attributes).each(function(idx, attribute) {
		result.info[attribute.ref] = cell[attribute.ref];
	});
	return result;
};

cubes.Hierarchy.prototype.readCell = function(cell, level_limit) {

	var result = [];
	var hie = this;

	for (var i = 0; i < this.levels.length; i ++) {
		var level = this.levels[i];
		info = level.readCell(cell);
		if (info != null) result.push(info);

		// Stop if we reach level_limit
		if ((level_limit != undefined) && (level_limit != null)) {
			if (level_limit.name == level.name) break;
		}
	}
	return result;
};


;/*
 * CubesViewer
 * Copyright (c) 2012-2015 Jose Juan Montes, see AUTHORS for more details
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * If your version of the Software supports interaction with it remotely through
 * a computer network, the above copyright notice and this permission notice
 * shall be accessible to all users.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

angular.module('cv.cubes', []);

angular.module('cv.cubes').service("cubesService", ['$rootScope', 'cvOptions',
                                                    function ($rootScope, cvOptions) {

	var cubesService = this;

	this.cubesserver = null;

	this.initialize = function() {
	};

	/**
	 * Connects this service to the Cubes server.
	 */
	this.connect = function() {
		// Initialize Cubes client library
		this.cubesserver = new cubes.Server(cubesService.cubesAjaxHandler);
		console.debug("Cubes client connecting to: " + cvOptions.cubesUrl);
		this.cubesserver.connect (cvOptions.cubesUrl, function() {
			console.debug('Cubes client initialized (server version: ' + cubesService.cubesserver.server_version + ')');
			//$(document).trigger ("cubesviewerInitialized", [ this ]);
			$rootScope.$apply();
		} );
	};


	/*
	 * Ajax handler for cubes library
	 */
	this.cubesAjaxHandler = function (settings) {
		return cubesService.cubesRequest(settings.url, settings.data || [], settings.success);
	};


	/*
	 * Cubes centralized request
	 */
	this.cubesRequest = function(path, params, successCallback) {

		// TODO: normalize how URLs are used (full URL shall come from client code)
		if (path.charAt(0) == '/') path = cvOptions.cubesUrl + path;

		var jqxhr = $.get(path, params, cubesService._cubesRequestCallback(successCallback), cvOptions.jsonRequestType);

		jqxhr.fail(cubesService.defaultRequestErrorHandler);

		return jqxhr;

	}

	this._cubesRequestCallback = function(pCallback) {
		var callback = pCallback;
		return function(data, status) {
			pCallback(data);
		}
	};

	/*
	 * Default XHR error handler for CubesRequests
	 */
	this.defaultRequestErrorHandler = function(xhr, textStatus, errorThrown) {
		// TODO: These alerts are not acceptable.
		if (xhr.status == 401) {
			cubesviewer.alert("Unauthorized.");
		} else if (xhr.status == 403) {
			cubesviewer.alert("Forbidden.");
		} else if (xhr.status == 400) {
			cubesviewer.alert($.parseJSON(xhr.responseText).message);
		} else {
			console.debug(xhr);
			cubesviewer.showInfoMessage("CubesViewer: An error occurred while accessing the data server.\n\n" +
										"Please try again or contact the application administrator if the problem persists.\n");
		}
		//$('.ajaxloader').hide();
	};


	/*
	 * Builds Cubes Server query parameters based on current view values.
	 */
	this.buildBrowserArgs = function(view, includeXAxis, onlyCuts) {

		// "lang": view.cubesviewer.options.cubesLang

		//console.debug(view);

		var args = {};

		if (!onlyCuts) {

			var drilldowns = view.params.drilldown.slice(0);

			// Include X Axis if necessary
			if (includeXAxis) {
				drilldowns.splice(0, 0, view.params.xaxis);
			}

			// Preprocess
			for (var i = 0; i < drilldowns.length; i++) {
				drilldowns[i] = cubes.drilldown_from_string(view.cube, view.cube.cvdim_parts(drilldowns[i]).fullDrilldownValue);
			}

			// Include drilldown array
			if (drilldowns.length > 0)
				args.drilldown = cubes.drilldowns_to_string(drilldowns);
		}

		// Cuts
		var cuts = this.buildQueryCuts(view);
		if (cuts.length > 0) args.cut = new cubes.Cell(view.cube, cuts);

		return args;

	}

	/*
	 * Builds Query Cuts
	 */
	this.buildQueryCuts = function(view) {

		// Include cuts
		var cuts = [];
		$(view.params.cuts).each(function(idx, e) {
			var invert = e.invert ? "!" : "";
			cuts.push(cubes.cut_from_string (view.cube, invert + e.dimension + ":" + e.value));
		});

		return cuts;
	};


	this.initialize();

}]);


;/*
 * CubesViewer
 * Copyright (c) 2012-2015 Jose Juan Montes, see AUTHORS for more details
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * If your version of the Software supports interaction with it remotely through
 * a computer network, the above copyright notice and this permission notice
 * shall be accessible to all users.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */


"use strict";

/*
 * Main cubesviewer object. It is created by the library and made
 * available as the global "cubesviewer" variable.
 */
function cubesviewerOLD() {

	// Alerts component
	this._alerts = null;

	// Current alerts
	this.alerts = [];


	/*
	 * Show a global alert
	 */
	this.alert = function (message) {
		alert ("CubesViewer " + this.version + "\n\n" + message);
	}

	/*
	 * Refresh
	 */
	this.refresh = function() {
		$(document).trigger("cubesviewerRefresh");
	}

  /*
   * Save typing while debugging - get a view object with: cubesviewer.getView(1)
   */

  this.getView = function(id) {
    var viewid = id.toString();
    viewid = viewid.indexOf('view') === 0 ? viewid : 'view' + viewid;
    viewid = viewid[0] === '#' ? viewid : '#' + viewid;

    return $(viewid + ' .cv-gui-viewcontent').data('cubesviewer-view');
  };


	/*
	 * Change language for Cubes operations
	 * (locale must be one of the possible languages for the model).
	 */
	this.changeCubesLang = function(lang) {

		this.options.cubesLang = (lang == "" ? null : lang);

		// Reinitialize system
		this.refresh();

	};

	/*
	 * Show quick tip message.
	 */
	this.showInfoMessage = function(message, delay) {

		if (this._alerts == null) {

			this._alerts = new Ractive({
				el: $("body")[0],
				append: true,
				template: cvtemplates.alerts,
				partials: cvtemplates,
				data: { 'cv': this }
			});
		}

		if (delay == undefined) delay = 5000;

		this.alerts.push({ 'text': message });
		this._alerts.reset({ 'cv': this });

	};

};

// Main CubesViewer angular module
angular.module('cv', ['bootstrapSubmenu',
                      'ui.grid', 'ui.grid.resizeColumns', 'ui.grid.selection', 'ui.grid.autoResize',
                      'ui.grid.pagination', 'ui.grid.pinning',
                      'cv.cubes', 'cv.views']);

// Configure moment.js
angular.module('cv').constant('angularMomentConfig', {
	// preprocess: 'unix', // optional
	// timezone: 'Europe/London' // optional
});

angular.module('cv').run([ '$timeout', 'cvOptions', 'cubesService', /* 'editableOptions', 'editableThemes', */
                           function($timeout, cvOptions, cubesService /*, editableOptions, editableThemes */) {

	//console.debug("Bootstrapping CubesViewer.");

    var defaultOptions = {
            cubesUrl : null,
            cubesLang : null,
            pagingOptions: [15, 30, 100, 250],
            datepickerShowWeek: true,
            datepickerFirstDay: 1,
            tableResizeHackMinWidth: 350 ,
            jsonRequestType: "json" // "json | jsonp"
    };
	$.extend(defaultOptions, cvOptions);
	$.extend(cvOptions, defaultOptions);

	// Avoid square brackets in serialized array params
	// TODO: Shall be done for $http instead?
	/*
	$.ajaxSetup({
		traditional : true
	});
	*/

	// XEditable bootstrap3 theme. Can be also 'bs2', 'default'
	/*
	editableThemes.bs3.inputClass = 'input-sm';
	editableThemes.bs3.buttonsClass = 'btn-sm';
	editableOptions.theme = 'bs3';
	*/

	// Initialize Cubes service
	cubesService.connect();

}]);


// Cubesviewer Javascript entry point
var cubesviewer = {

	// CubesViewer version
	version: "2.0.1-devel",

	VIEW_STATE_INITIALIZING: 1,
	VIEW_STATE_INITIALIZED: 2,
	VIEW_STATE_ERROR: 3,

	_configure: function(options) {
		$('.cv-version').html(cubesviewer.version);
		angular.module('cv').constant('cvOptions', options);
	},

	init: function(options) {

		this._configure(options);
		angular.element(document).ready(function() {
			angular.bootstrap(document, ['cv']);
		});
	}

};



;/*
 * CubesViewer
 * Copyright (c) 2012-2015 Jose Juan Montes, see AUTHORS for more details
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * If your version of the Software supports interaction with it remotely through
 * a computer network, the above copyright notice and this permission notice
 * shall be accessible to all users.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */


'use strict';


angular.module('cv.views', ['cv.views.cube']);

angular.module('cv.views').service("viewsService", ['$rootScope', 'cvOptions', 'cubesService',
                                                    function ($rootScope, cvOptions, cubesService) {

	this.views = [];

	/**
	 * Adds a new clean view for a cube.
	 * This accepts parameters as an object or as a serialized string.
	 */
	this.createView = function(id, type, data) {

		// Create view

		var params = {};

		if (typeof data == "string") {
			try {
				params = $.parseJSON(data);
			} catch (err) {
				alert ('Error: could not process serialized data (JSON parse error).');
				params["name"] = "Undefined view";
			}
		} else {
			params = data;
		}

		var view = {
			"id": id,
			"type": type,
			"state": cubesviewer.STATE_INITIALIZING,
			"params": {}
		};

		$.extend(view.params, params);
		$(document).trigger("cubesviewerViewCreate", [ view ] );
		$.extend(view.params, params);


		if (view.state == cubesviewer.STATE_INITIALIZING) view.state = cubesviewer.STATE_INITIALIZED;

		return view;
	};


}]);


/**
 * cvView directive. This is the core CubesViewer directive, which shows
 * a configured view.
 */
/* */


function cubesviewerViews () {

	/*
	 * Shows an error message on a view container.
	 */
	this.showFatal = function (container, message) {
		container.empty().append (
				'<div class="ui-widget">' +
				'<div class="ui-state-error ui-corner-all" style="padding: 0 .7em;">' +
				'<p><span class="ui-icon ui-icon-alert" style="float: left; margin-right: .3em;"></span>' +
				'<strong>Error</strong><br/><br/>' + message +
				'</p></div></div>'
		);
	}



	/*
	 * Block the view interface.
	 */
	this.blockView = function (view, message) {
		if (message == "undef") message = null;
		$(view.container).block({
			"message": message,
			"fadeOut": 200,
			"onUnblock": function() {
				// Fix conflict with jqBlock which makes menus to not overflow off the view (makes menus innacessible)
				$(view.container).css("position", "inherit");
			}
		});
	}

	/*
	 * Block the view interface with a loading message
	 */
	this.blockViewLoading = function (view) {
		this.blockView (view, '<span class="ajaxloader" title="Loading..." >&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Loading</span>');
	}

	/*
	 * Unblock the view interface.
	 */
	this.unblockView = function (view) {

		$(view.container).unblock();

	}


	/*
	 * Triggers redraw for a given view.
	 */
	this.redrawView = function (view) {
		// TODO: Review if if below is needed
		//if (view == null) return;
		$(document).trigger ("cubesviewerViewDraw", [ view ]);
	}

	/*
	 * Updates view when the view is refreshed.
	 */
	this.onViewDraw = function (event, view) {

		if (view.state == cubesviewer.views.STATE_ERROR) {
			cubesviewer.views.showFatal (view.container, 'An error has occurred. Cannot present view.');
			event.stopImmediatePropagation();
			return;
		}

	}

	/*
	 * Serialize view data.
	 */
	this.serialize = function (view) {
		return JSON.stringify(view.params);
	};

};

;/*
 * CubesViewer
 * Copyright (c) 2012-2015 Jose Juan Montes, see AUTHORS for more details
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * If your version of the Software supports interaction with it remotely through
 * a computer network, the above copyright notice and this permission notice
 * shall be accessible to all users.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

'use strict';

/**
 * CubesViewer view module.
 */
angular.module('cv.views.cube', []);


/**
 * cvViewCube directive and controller.
 */
angular.module('cv.views.cube').controller("CubesViewerViewsCubeController", ['$rootScope', '$scope', 'cvOptions', 'cubesService', 'viewsService',
                                                     function ($rootScope, $scope, cvOptions, cubesService, viewsService) {

	$scope.view._cubeDataUpdated = false;

	$scope.dimensionFilter = null;


	/**
	 * Define view mode ('explore', 'series', 'facts', 'chart').
	 */
	$scope.setViewMode = function(mode) {
		$scope.view.params.mode = mode;
		$scope.view._cubeDataUpdated = true;
	};


	$scope.initCube = function() {

		$scope.view.cube = null;

		// Apply default cube view parameters
		var cubeViewDefaultParams = {
			"mode" : "explore",
			"drilldown" : [],
			"cuts" : []
		};
		$scope.view.params = $.extend(true, {}, cubeViewDefaultParams, $scope.view.params);

		var jqxhr = cubesService.cubesserver.get_cube($scope.view.params.cubename, function(cube) {

			$scope.view.cube = cube;

			// Apply parameters if cube metadata contains specific cv-view-params
			// TODO: Don't do this if this was a saved or pre-initialized view, only for new views
			if ('cv-view-params' in $scope.view.cube.info) $.extend($scope.view.params, $scope.view.cube.info['cv-view-params']);

			$scope.view._cubeDataUpdated = true;

			//$rootScope.$apply();

		});
		if (jqxhr) {
			jqxhr.fail(function() {
				$scope.view.state = cubesviewer.STATE_ERROR;
				$rootScope.$apply();
			});
		}
	};

	/**
	 * Adds a drilldown level.
	 * Dimension is encoded using Cubes notation: dimension[@hierarchy][:level]
	 */
	$scope.selectDrill = function(dimension, value) {

		var cube = $scope.view.cube;

		// view.params.drilldown = (drilldown == "" ? null : drilldown);
		if (dimension == "") {
			$scope.view.params.drilldown = [];
		} else {
			$scope.removeDrill(dimension);
			if (value == true) {
				$scope.view.params.drilldown.push(dimension);
			}
		}

		$scope.view._cubeDataUpdated = true;
	};

	/**
	 * Removes a level from the view.
	 */
	$scope.removeDrill = function(drilldown) {

		var drilldowndim = drilldown.split(':')[0];

		for ( var i = 0; i < $scope.view.params.drilldown.length; i++) {
			if ($scope.view.params.drilldown[i].split(':')[0] == drilldowndim) {
				$scope.view.params.drilldown.splice(i, 1);
				break;
			}
		}

		$scope.view._cubeDataUpdated = true;
	};

	/**
	 * Accepts an aggregation or a measure and returns the formatter function.
	 */
	$scope.columnFormatFunction = function(agmes) {

		var view = $scope.view;

		var measure = agmes;

		if (!measure) {
			return function(value) {
				return value;
			};
		}

		if ('measure' in agmes) {
			measure = $.grep(view.cube.measures, function(item, idx) { return item.ref == agmes.measure })[0];
		}

		var formatterFunction = null;
		if (measure && ('cv-formatter' in measure.info)) {
			formatterFunction = function(value, row) {
				return eval(measure.info['cv-formatter']);
			};
		} else {
			formatterFunction = function(value) {
				return Math.formatnumber(value, (agmes.ref=="record_count" ? 0 : 2));
			};
		}

		return formatterFunction;
	};

	/*
	 * Filters current selection
	 */
	$scope.filterSelected = function() {

		console.debug("Filtering");

		var view = $scope.view;

		if (view.params.drilldown.length != 1) {
			alert('Can only filter multiple values in a view with one level of drilldown.');
			return;
		}

		console.debug($scope.gridApi);

		if ($scope.gridApi.selection.getSelectedCount() <= 0) {
			alert('Cannot filter. No rows are selected.');
			return;
		}

		var filterValues = [];
		var selectedRows = $scope.gridApi.selection.getSelectedRows();
		$(selectedRows).each( function(idx, gd) {
			filterValues.push(gd["key0"].cutValue);
		});

		var invert = false;
		$scope.selectCut($scope.gridOptions.columnDefs[0].cutDimension, filterValues.join(";"), invert);

	};

	// Select a cut
	$scope.selectCut = function(dimension, value, invert) {

		console.debug("Filtering");

		var view = $scope.view;

		if (dimension != "") {
			if (value != "") {
				/*
				var existing_cut = $.grep(view.params.cuts, function(e) {
					return e.dimension == dimension;
				});
				if (existing_cut.length > 0) {
					//view.cubesviewer.alert("Cannot cut dataset. Dimension '" + dimension + "' is already filtered.");
					//return;
				} else {*/
					view.params.cuts = $.grep(view.params.cuts, function(e) {
						return e.dimension == dimension;
					}, true);
					view.params.cuts.push({
						"dimension" : dimension,
						"value" : value,
						"invert" : invert
					});
				/*}*/
			} else {
				view.params.cuts = $.grep(view.params.cuts, function(e) {
					return e.dimension == dimension;
				}, true);
			}
		} else {
			view.params.cuts = [];
		}

		$scope.view._cubeDataUpdated = true;

	};

	$scope.showDimensionFilter = function(dimension) {
		$scope.view.dimensionFilter = dimension;
	};

	/*
	 * Selects measure axis
	 */
	$scope.selectMeasure = function(measure) {
		$scope.view.params.yaxis = measure;
		$scope.view._cubeDataUpdated = true;
	}

	/*
	 * Selects horizontal axis
	 */
	$scope.selectXAxis = function(dimension) {
		$scope.view.params.xaxis = (dimension == "" ? null : dimension);
		$scope.view._cubeDataUpdated = true;
	}

	/*
	 * Selects chart type
	 */
	$scope.selectChartType = function(charttype) {
		$scope.view.params.charttype = charttype;
		$scope.view._cubeDataUpdated = true;
	};


}]).directive("cvViewCube", function() {
	return {
		restrict: 'A',
		templateUrl: 'views/cube/cube.html',
		scope: {
			view: "="
		},
		controller: "CubesViewerViewsCubeController",
		link: function(scope, iElement, iAttrs) {
			//console.debug(scope);
			scope.initCube();
		}
	};
});


Math.formatnumber = function(value, decimalPlaces, decimalSeparator, thousandsSeparator) {


	if (value === undefined) return "";

	if (decimalPlaces === undefined) decimalPlaces = 2;
	if (decimalSeparator === undefined) decimalSeparator = ".";
	if (thousandsSeparator === undefined) thousandsSeparator = " ";

	var result = "";


	var intString = Math.floor(value).toString();
	for (var i = 0; i < intString.length; i++) {
		result = result + intString[i];
		var invPos = (intString.length - i - 1);
		if (invPos > 0 && invPos % 3 == 0) result = result + thousandsSeparator;
	}
	if (decimalPlaces > 0) {
		result = result + parseFloat(value - Math.floor(value)).toFixed(decimalPlaces).toString().replace(".", decimalSeparator).substring(1);
	}

	return result;
};

;/*
 * CubesViewer
 * Copyright (c) 2012-2015 Jose Juan Montes, see AUTHORS for more details
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * If your version of the Software supports interaction with it remotely through
 * a computer network, the above copyright notice and this permission notice
 * shall be accessible to all users.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */


/**
 */
angular.module('cv.views.cube').controller("CubesViewerViewsCubeExploreController", ['$rootScope', '$scope', '$timeout', 'cvOptions', 'cubesService', 'viewsService',
                                                     function ($rootScope, $scope, $timeout, cvOptions, cubesService, viewsService) {

	$scope.$parent.gridData = [];

	// TODO: Move to explore view or grid component as cube view shall be split into directives
    $scope.$parent.onGridRegisterApi = function(gridApi) {
    	//console.debug("Grid Register Api: Explore");
        $scope.gridApi = gridApi;
        gridApi.selection.on.rowSelectionChanged($scope,function(row){
          console.debug(row.entity);
        });
        gridApi.selection.on.rowSelectionChangedBatch($scope,function(rows){
          console.debug(rows);
        });

    };
	$scope.$parent.gridApi = null;
	$scope.$parent.gridOptions = {
		onRegisterApi: $scope.onGridRegisterApi,
		selectionRowHeaderWidth: 24,
		//enableRowHeaderSelection: false,
	};


	$scope.initialize = function() {
	};

	$scope.$watch("view._cubeDataUpdated", function(newVal) {
		if (newVal) {
			$scope.view._cubeDataUpdated = false;
			$scope.loadData();
		}
	});



	$scope.loadData = function() {

		//$scope.view.cubesviewer.views.blockViewLoading(view);
		var browser_args = cubesService.buildBrowserArgs($scope.view, false, false);
		var browser = new cubes.Browser(cubesService.cubesserver, $scope.view.cube);
		var jqxhr = browser.aggregate(browser_args, $scope._loadDataCallback);
		jqxhr.always(function() {
			//view.cubesviewer.views.unblockView(view);
		});

	};

	$scope._loadDataCallback = function(data, status) {
		$scope.processData(data);
		$rootScope.$apply();
		$scope.gridApi.core.refresh();
		$rootScope.$apply();
	};

	$scope.processData = function(data) {

		var view = $scope.view;

		$scope.gridData = [];
		$scope.gridFormatters = {};


	    // Configure grid
	    angular.extend($scope.$parent.gridOptions, {
    		data: $scope.gridData,
    		//minRowsToShow: 3,
    		rowHeight: 24,
    		onRegisterApi: $scope.onGridRegisterApi,
    		enableColumnResizing: true,
    		showColumnFooter: true,
    		enableGridMenu: true,
    		//showGridFooter: true,
    	    paginationPageSizes: cvOptions.pagingOptions,
    	    paginationPageSize: cvOptions.pagingOptions[0],
    		//enableHorizontalScrollbar: 0,
    		//enableVerticalScrollbar: 0,
    		enableRowSelection: view.params.drilldown.length > 0,
    		//enableRowHeaderSelection: false,
    		//enableSelectAll: false,
    		enablePinning: false,
    		multiSelect: true,
    		selectionRowHeaderWidth: 20,
    		//rowHeight: 50,
    		columnDefs: []
	    });

		$(view.cube.aggregates).each(function(idx, ag) {
			var col = {
				name: ag.label,
				field: ag.ref,
				index : ag.ref,
				cellClass : "text-right",
				//sorttype : "number",
				width : 115, //view.cube.explore.defineColumnWidth(view, ag.ref, 95),
				cellTemplate: '<div class="ui-grid-cell-contents" title="TOOLTIP">{{ col.colDef.formatter(COL_FIELD, row, col) }}</div>',
				formatter: $scope.columnFormatFunction(ag),
				footerValue: $scope.columnFormatFunction(ag)(data.summary[ag.ref], null, col)
				//formatoptions: {},
				//cellattr: cubesviewer.views.cube.explore.columnTooltipAttr(ag.ref),
			};
			col.footerCellTemplate = '<div class="ui-grid-cell-contents text-right">{{ col.colDef.footerValue }}</div>';
			$scope.gridOptions.columnDefs.push(col);

			//if (data.summary) dataTotals[ag.ref] = data.summary[ag.ref];
		});

		// If there are cells, show them
		$scope._sortData(data.cells, false);
		$scope._addRows(data);

		/*
		colNames.sort();
		colModel.sort(function(a, b) {
			return (a.name < b.name ? -1 : (a.name == b.name ? 0 : 1));
		});
		*/

		var label = [];
		$(view.params.drilldown).each(function(idx, e) {
			label.push(view.cube.cvdim_dim(e).label);
		});
		for (var i = 0; i < view.params.drilldown.length; i++) {

			// Get dimension
			var dim = view.cube.cvdim_dim(view.params.drilldown[i]);
			var parts = view.cube.cvdim_parts(view.params.drilldown[i]);
			var cutDimension = parts.dimension.name + ( parts.hierarchy.name != "default" ? "@" + parts.hierarchy.name : "" );

			//nid.push(drilldown_level_values.join("-"));

			var footer = "";
			if (i == 0) footer = (cubesService.buildQueryCuts(view).length == 0) ? "<b>Summary</b>" : "<b>Summary <i>(Filtered)</i></b>";

			$scope.gridOptions.columnDefs.splice(i, 0, {
				name: label[i],
				field: "key" + i,
				index: "key" + i,
				enableHiding: false,
				cutDimension: cutDimension,
				width: 190, //cubesviewer.views.cube.explore.defineColumnWidth(view, "key" + i, 130)
				cellTemplate: '<div class="ui-grid-cell-contents" title="TOOLTIP"><a href="" ng-click="grid.appScope.selectCut(col.colDef.cutDimension, COL_FIELD.cutValue, false)">{{ COL_FIELD.title }}</a></div>',
				footerCellTemplate: '<div class="ui-grid-cell-contents">' + footer + '</div>',
			});
		}

		if (view.params.drilldown.length == 0) {
			$scope.gridOptions.columnDefs.splice(0, 0, {
				name: view.cube.label,
				field: "key" + 0,
				index: "key" + 0,
				enableHiding: false,
				align: "left",
				width: 190 //cubesviewer.views.cube.explore.defineColumnWidth(view, "key" + 0, 110)
			});
		}


	};

	/*
	 * Show received summary
	 */
	this.drawSummary = function(view, data) {

		$('#summaryTable-' + view.id).get(0).updateIdsOfSelectedRows = function(
				id, isSelected) {
			var index = $.inArray(id,
					$('#summaryTable-' + view.id).get(0).idsOfSelectedRows);
			if (!isSelected && index >= 0) {
				$('#summaryTable-' + view.id).get(0).idsOfSelectedRows.splice(
						index, 1); // remove id from the list
			} else if (index < 0) {
				$('#summaryTable-' + view.id).get(0).idsOfSelectedRows.push(id);
			}
		};

		$('#summaryTable-' + view.id).get(0).idsOfSelectedRows = [];
		$('#summaryTable-' + view.id)
				.jqGrid(
						{
							data : dataRows,
							userData : (data.summary ? dataTotals : null),
							datatype : "local",
							height : 'auto',
							rowNum : cubesviewer.options.pagingOptions[0],
							rowList : cubesviewer.options.pagingOptions,
							colNames : colNames,
							colModel : colModel,
							pager : "#summaryPager-" + view.id,
							sortname : cubesviewer.views.cube.explore.defineColumnSort(view, ["key", "desc"])[0],
							viewrecords : true,
							sortorder : cubesviewer.views.cube.explore.defineColumnSort(view, ["key", "desc"])[1],
							footerrow : true,
							userDataOnFooter : true,
							forceFit : false,
							shrinkToFit : false,
							width: cubesviewer.options.tableResizeHackMinWidth,
							// autowidth: true,
							multiselect : true,
							multiboxonly : true,

							// caption: "Current selection data" ,
							// beforeSelectRow : function () { return false; }

							onSelectRow : $('#summaryTable-' + view.id).get(0).updateIdsOfSelectedRows,
							onSelectAll : function(aRowids, isSelected) {
								var i, count, id;
								for (i = 0, count = aRowids.length; i < count; i++) {
									id = aRowids[i];
									$('#summaryTable-' + view.id).get(0)
											.updateIdsOfSelectedRows(id,
													isSelected);
								}
							},
							loadComplete : function() {
								var i, count;
								for (
										i = 0,
										count = $('#summaryTable-' + view.id)
												.get(0).idsOfSelectedRows.length; i < count; i++) {
									$(this)
											.jqGrid(
													'setSelection',
													$('#summaryTable-' + view.id)
															.get(0).idsOfSelectedRows[i],
													false);
								}
								// Call hook
								view.cubesviewer.views.cube.explore.onTableLoaded (view);
							},
							resizeStop: view.cubesviewer.views.cube.explore._onTableResize (view),
							onSortCol: view.cubesviewer.views.cube.explore._onTableSort (view),

						});

		this.cubesviewer.views.cube._adjustGridSize(); // remember to copy also the window.bind-resize init


	};

	$scope._addRows = function(data) {

		var view = $scope.view;
		var rows = $scope.gridData;

		$(data.cells).each( function(idx, e) {

			var nid = [];
			var row = {};
			var key = [];

			// For each drilldown level
			for ( var i = 0; i < view.params.drilldown.length; i++) {

				// Get dimension
				var dim = view.cube.cvdim_dim(view.params.drilldown[i]);

				var parts = view.cube.cvdim_parts(view.params.drilldown[i]);
				var infos = parts.hierarchy.readCell(e, parts.level);

				// Values and Labels
				var drilldown_level_values = [];
				var drilldown_level_labels = [];

				$(infos).each(function(idx, info) {
					drilldown_level_values.push (info.key);
					drilldown_level_labels.push (info.label);
				});

				nid.push(drilldown_level_values.join("-"));

				var cutDimension = parts.dimension.name + ( parts.hierarchy.name != "default" ? "@" + parts.hierarchy.name : "" );
				key.push({ cutValue: drilldown_level_values.join(","), title: drilldown_level_labels.join(" / ")});
			}

			// Set key
			row["key"] = key.join (" / ");
			for (var i = 0; i < key.length; i++) {
				row["key" + i] = key[i];
			}
			//row["key"] = key.join(' / ');

			// Add columns
			$(view.cube.aggregates).each(function(idx, ag) {
				row[ag.ref] = e[ag.ref];
			});

			row["id"] = nid.join('-');
			rows.push(row);
		});

		// Copy summary if there's no data
		// This allows a scrollbar to appear in jqGrid when only the summary row is shown.
		if ((rows.length == 0) && (data.summary)) {
			var row = {};
			var summary = (cubesService.buildQueryCuts(view).length == 0) ? "Summary" : "Summary (Filtered)";
			row["key0"] = summary;

			$(view.cube.aggregates).each(function(idx, ag) {
				row[ag.ref] = data.summary[ag.ref];
			});

			rows.push(row);
		}

	};

	// Sort data according to current view
	$scope._sortData = function(data, includeXAxis) {
		//data.sort(cubesviewer._drilldownSortFunction(view.id, includeXAxis));
	};

	$scope.initialize();

}]);




function cubesviewerViewCubeExplore() {


	/*
	 *
	 */
	this._drilldownSortFunction = function(view, includeXAxis) {

		var drilldown = view.params.drilldown.slice(0);

		// Include X Axis if necessary
		if (includeXAxis) {
			drilldown.splice(0, 0, view.params.xaxis);
		}

		return function(a, b) {

			// For the horizontal axis drilldown level, if present
			for ( var i = 0; i < drilldown.length; i++) {

				// Get dimension
				var dimension = view.cube.cvdim_dim(drilldown[i]);

				// row["key"] = ((e[view.params.drilldown_field] != null) &&
				// (e[view.params.drilldown] != "")) ? e[view.params.drilldown] : "Undefined";
				if (dimension.is_flat == true) {
					if (a[dimension.name] < b[dimension.name])
						return -1;
					if (a[dimension.name] > b[dimension.name])
						return 1;
				} else {
					var drilldown_level_value = [];
					for ( var j = 0; j < dimension.levels.length; j++) {
						var fieldname = dimension.name + "."
								+ dimension.levels[j].name;
						if ((fieldname in a) && (fieldname in b)) {
							if (a[fieldname] < b[fieldname])
								return -1;
							if (a[fieldname] > b[fieldname])
								return 1;
						} else {
							break;
						}
					}
				}
			}

			return 0;
		};
	},

	this.columnTooltipAttr = function(column) {
		return function (rowId, val, rawObject) {
			return 'title="' + column + ' = ' + val + '"';
		};
	};



	this._onTableSort = function (view) {
		return function (index, iCol, sortorder) {
			view.cubesviewer.views.cube.explore.onTableSort (view, index, iCol, sortorder);
		}
	}

	this._onTableResize = function (view) {
		return function(width, index) {
			view.cubesviewer.views.cube.explore.onTableResize (view, width, index);
		};
	};

	this.onTableResize = function (view, width, index) {
		// Empty implementation, to be overrided
		//alert("resize column " + index + " to " + width + " pixels");
	};
	this.onTableLoaded = function (view) {
		// Empty implementation, to be overrided
	};
	this.onTableSort = function (view, key, index, iCol, sortorder) {
		// Empty implementation, to be overrided
	};

	this.defineColumnWidth = function (view, column, vdefault) {
		// Simple implementation. Overrided by the columns plugin.
		return vdefault;
	};
	this.defineColumnSort = function (view, vdefault) {
		// Simple implementation. Overrided by the columns plugin.
		return vdefault;
	};


};


;/*
 * CubesViewer
 * Copyright (c) 2012-2015 Jose Juan Montes, see AUTHORS for more details
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * If your version of the Software supports interaction with it remotely through
 * a computer network, the above copyright notice and this permission notice
 * shall be accessible to all users.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */



/**
 */
angular.module('cv.views.cube').controller("CubesViewerViewsCubeFilterDimensionController", ['$rootScope', '$scope', 'cvOptions', 'cubesService', 'viewsService',
                                                     function ($rootScope, $scope, cvOptions, cubesService, viewsService) {

	$scope.parts = null;
	$scope.dimensionValues = null;
	$scope.loadingDimensionValues = false;

	$scope.initialize = function() {

	};

	$scope.$watch("view.dimensionFilter", function() {
		$scope.parts = $scope.view.cube.cvdim_parts($scope.view.dimensionFilter);
		$scope.loadDimensionValues();
	});

	$scope.closeDimensionFilter = function() {
		$scope.view.dimensionFilter = null;
	};

	/**
	 * Load dimension values.
	 */
	$scope.loadDimensionValues = function() {

		var params = {
				"hierarchy": $scope.parts.hierarchy.name,
				"depth": $scope.parts.depth
		};

		//view.cubesviewer.views.blockViewLoading(view);

		var tdimension = $scope.view.dimensionFilter;
		$scope.loadingDimensionValues = true;
		jqxhr = cubesService.cubesRequest(
                // Doc says it's dimension, not members
				"/cube/" + $scope.view.cube.name + "/members/" + $scope.parts.dimension.name,
				params,
				$scope._loadDimensionValuesCallback(tdimension));
		jqxhr.always(function() {
			//unblockView
			console.debug("Function");
			$scope.loadingDimensionValues = false;
			$scope.$apply();
		});

	};

	/**
	 * Updates info after loading data.
	 */
	$scope._loadDimensionValuesCallback = function(dimension) {
		var dimension = dimension;
		return function(data, status) {
			if ($scope.view.dimensionFilter == dimension) $scope._processData(data);
		};
	};

	$scope._processData = function(data) {

		console.debug(data);

		// Get dimension
		var dimension = $scope.view.cube.cvdim_dim($scope.view.dimensionFilter);
		var dimensionValues = [];

		$(data.data).each( function(idx, e) {

			// Get dimension
			var parts = $scope.view.cube.cvdim_parts($scope.view.dimensionFilter);
			var infos = parts.hierarchy.readCell(e, parts.level);

			// Values and Labels
			var drilldown_level_values = [];
			var drilldown_level_labels = [];

			$(infos).each(function(idx, info) {
				drilldown_level_values.push (info.key);
				drilldown_level_labels.push (info.label);
			});

			dimensionValues.push({
				'label': drilldown_level_labels.join(' / '),
				'value': drilldown_level_values.join (',')
			});

		});

		$scope.dimensionValues = dimensionValues;
		console.debug($scope.dimensionValues);
	};

	$scope.initialize();

}]);



/**5
 * Adds support for filter dialogs for dimensions. Note that
 * filtering support is available from other plugins. Default filtering
 * features are included in the normal explore view (user
 * can select values after drilling down). This plugin adds
 * more flexibility.
 */
function cubesviewerViewCubeDimensionFilter () {


	/*
	 * Shows the dimension filter
	 */
	this.drawDimensionFilter = function (view, dimension) {

		var parts = view.cube.cvdim_parts(dimension);

		// Draw value container

		$(view.container).find(".cv-views-dimensionfilter-apply").button().click(function() {
			view.cubesviewer.views.cube.dimensionfilter.applyFilter( view, dimension );
		});
		$(view.container).find(".cv-views-dimensionfilter-cancel").button().click(function() {
			view.dimensionFilter = null;
			$(view.container).find('.cv-view-dimensionfilter').remove();
		});

		$(view.container).find("#cv-views-dimensionfilter-cols-" + view.id).buttonset();
		$(view.container).find("#cv-views-dimensionfilter-col1-" + view.id).click(function() {
			view.cubesviewer.views.cube.dimensionfilter.drawDimensionValuesCols( view, 1 );
		});
		$(view.container).find("#cv-views-dimensionfilter-col2-" + view.id).click(function() {
			view.cubesviewer.views.cube.dimensionfilter.drawDimensionValuesCols( view, 2 );
		});

		$(view.container).find(".cv-views-dimensionfilter-selectall").button().click(function() {
			// Clear previous selected items before applying new clicks
			$(view.container).find(".cv-view-dimensionfilter-list").find(":checkbox").filter(":checked").trigger('click');
			$(view.container).find(".cv-view-dimensionfilter-list").find(":checkbox:visible").trigger('click');
		});
		$(view.container).find(".cv-views-dimensionfilter-selectnone").button().click(function() {
			$(view.container).find(".cv-view-dimensionfilter-list").find(":checkbox").filter(":checked").trigger('click');
		});

		$(view.container).find(".cv-views-dimensionfilter-drill").button().click(function() {
			cubesviewer.views.cube.explore.selectDrill(view, parts.fullDrilldownValue, "1");
			return false;
		});

		// Obtain data


	};



	/*
	 * Shows the dimension filter
	 */
	this.drawDimensionValues = function (view, tdimension, data) {

		$(view.container).find(".cv-view-dimensionfilter-list").empty();


		// Update selected
		view.cubesviewer.views.cube.dimensionfilter.updateFromCut(view, tdimension);

	};

	/*
	 * Searches labels by string and filters from view.
	 */
	this.searchDimensionValues = function(view, search) {

		$(view.container).find(".cv-view-dimensionfilter-list").find("input").each (function (idx, e) {
			if ((search == "") || ($(e).parent().text().toLowerCase().indexOf(search.toLowerCase()) >= 0)) {
				$(e).parents('.cv-view-dimensionfilter-item').first().show();
			} else {
				$(e).parents('.cv-view-dimensionfilter-item').first().hide();
			}
		} );

	};

	/*
	 * Updates selection after loading data.
	 */
	this.updateFromCut = function(view, dimensionString) {

		var parts = view.cube.cvdim_parts(dimensionString);
		var cutDimension = parts.dimension.name + ( parts.hierarchy.name != "default" ? "@" + parts.hierarchy.name : "" );

		var invert = false;
		var filterValues = [];
		for (var i = 0; i < view.params.cuts.length ; i++) {
			if (view.params.cuts[i].dimension == cutDimension) {
				invert = view.params.cuts[i].invert;
				filterValues = view.params.cuts[i].value.split(";");
				break;
			}
		}

		if (invert) {
			$(view.container).find(".cv-view-dimensionfilter-cont .invert-cut").attr("checked", "checked");
		}

		if (filterValues.length > 0) {
			$(view.container).find(".cv-view-dimensionfilter-list").find("input").each (function (idx, e) {
				for (var i = 0; i < filterValues.length; i++) {
					if ($(e).attr("value") == filterValues[i]) {
						$(e).attr("checked", "checked");
					}
				}
			} );
		}

	};

	/*
	 * Updates info after loading data.
	 */
	this.applyFilter = function(view, dimensionString) {

		var parts = view.cube.cvdim_parts(dimensionString);

		var checked = $(view.container).find(".cv-view-dimensionfilter-list").find("input:checked");

		// Empty selection would yield no result
		/*
		if (checked.size() == 0) {
			view.cubesviewer.alert('Cannot filter. No values are selected.');
			return;
		}
		*/

		var filterValues = [];
		// If all values are selected, the filter is empty and therefore removed by selectCut
		if (checked.size() < $(view.container).find(".cv-view-dimensionfilter-list").find("input").size()) {
			$(view.container).find(".cv-view-dimensionfilter-list").find("input:checked").each(function (idx, e) {
				filterValues.push( $(e).attr("value") );
			});
		}

		var invert = $(view.container).find(".cv-view-dimensionfilter .invert-cut").is(":checked");

		var cutDimension = parts.dimension.name + ( parts.hierarchy.name != "default" ? "@" + parts.hierarchy.name : "" );
		cubesviewer.views.cube.explore.selectCut(view, cutDimension, filterValues.join(";"), invert);

	};

}

;/*
 * CubesViewer
 * Copyright (c) 2012-2016 Jose Juan Montes, see AUTHORS for more details
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Sof	tware, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * If your version of the Software supports interaction with it remotely through
 * a computer network, the above copyright notice and this permission notice
 * shall be accessible to all users.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */


/**
 * Facts table. Allows users to see the facts associated to current cut.
 */
angular.module('cv.views.cube').controller("CubesViewerViewsCubeFactsController", ['$rootScope', '$scope', '$timeout', 'cvOptions', 'cubesService', 'viewsService',
                                                     function ($rootScope, $scope, $timeout, cvOptions, cubesService, viewsService) {

	$scope.$parent.gridData = [];

	// TODO: Move to explore view or grid component as cube view shall be split into directives
    $scope.$parent.onGridRegisterApi = function(gridApi) {
    	//console.debug("Grid Register Api: Facts");
        $scope.gridApi = gridApi;
        gridApi.selection.on.rowSelectionChanged($scope,function(row){
          console.debug(row.entity);
        });
        gridApi.selection.on.rowSelectionChangedBatch($scope,function(rows){
          console.debug(rows);
        });

    };
	$scope.$parent.gridApi = null;
	$scope.$parent.gridOptions = {
		onRegisterApi: $scope.onGridRegisterApi,
		enableRowSelection: false,
		enableRowHeaderSelection: false,
	};


	$scope.initialize = function() {
	};

	$scope.$watch("view._cubeDataUpdated", function(newVal) {
		if (newVal) {
			$scope.view._cubeDataUpdated = false;
			$scope.loadData();
		}
	});



	$scope.loadData = function() {

		var browser_args = cubesService.buildBrowserArgs($scope.view, false, false);
		var browser = new cubes.Browser(cubesService.cubesserver, $scope.view.cube);
		var jqxhr = browser.facts(browser_args, $scope._loadDataCallback);
		jqxhr.always(function() {
			//view.cubesviewer.views.unblockView(view);
		});

	};

	$scope._loadDataCallback = function(data, status) {
		$scope.processData(data);
		$rootScope.$apply();
		$scope.gridApi.core.refresh();
		$rootScope.$apply();
	};

	$scope.processData = function(data) {

		var view = $scope.view;

		$scope.gridData = [];
		$scope.gridFormatters = {};

		var dimensions = view.cube.dimensions;
		var measures = view.cube.measures;
        var details = view.cube.details;

	    // Configure grid
	    angular.extend($scope.$parent.gridOptions, {
    		data: $scope.gridData,
    		//minRowsToShow: 3,
    		rowHeight: 24,
    		onRegisterApi: $scope.onGridRegisterApi,
    		enableColumnResizing: true,
    		//showColumnFooter: true,
    		enableGridMenu: true,
    		//showGridFooter: true,
    	    paginationPageSizes: cvOptions.pagingOptions,
    	    paginationPageSize: cvOptions.pagingOptions[0],
    		//enableHorizontalScrollbar: 0,
    		//enableVerticalScrollbar: 0,
    		enableRowSelection: false,
    		enableRowHeaderSelection: false,
    		//enableSelectAll: false,
    		enablePinning: false,
    		multiSelect: false,
    		//selectionRowHeaderWidth: 20,
    		//rowHeight: 50,
    		columnDefs: []
	    });

		$scope.gridOptions.columnDefs.push({
			name: "id",
			field: "id",
			index: "id",
			enableHiding: false,
			width: 80, //cubesviewer.views.cube.explore.defineColumnWidth(view, "id", 65),
		});

		for (var dimensionIndex in dimensions) {
			// Get dimension
			var dimension = dimensions[dimensionIndex];

			for (var i = 0; i < dimension.levels.length; i++) {
				var level = dimension.levels[i];
				var col = {
					name: level.label,
					field: level.key().ref,
					index : level.key().ref,
					//cellClass : "text-right",
					//sorttype : "number",
					width : 95, //cubesviewer.views.cube.explore.defineColumnWidth(view, level.key().ref, 85),
					cellTemplate: '<div class="ui-grid-cell-contents" title="TOOLTIP">{{ row.entity[col.colDef.field] }}</div>',
					//formatter: $scope.columnFormatFunction(ag),
					//footerValue: $scope.columnFormatFunction(ag)(data.summary[ag.ref], null, col)
					//formatoptions: {},
					//cellattr: cubesviewer.views.cube.explore.columnTooltipAttr(ag.ref),
					//footerCellTemplate = '<div class="ui-grid-cell-contents text-right">{{ col.colDef.footerValue }}</div>';
				};
				$scope.gridOptions.columnDefs.push(col);
			}
		}

		for (var measureIndex in measures) {
			var measure = measures[measureIndex];

			var col = {
				name: measure.label,
				field: measure.ref,
				index : measure.ref,
				cellClass : "text-right",
				sorttype : "number",
				width : 75, //cubesviewer.views.cube.explore.defineColumnWidth(view, measure.ref, 75),
				cellTemplate: '<div class="ui-grid-cell-contents" title="TOOLTIP">{{ col.colDef.formatter(COL_FIELD, row, col) }}</div>',
				formatter: $scope.columnFormatFunction(measure),
				//footerValue: $scope.columnFormatFunction(ag)(data.summary[ag.ref], null, col)
				//formatoptions: {},
				//cellattr: cubesviewer.views.cube.explore.columnTooltipAttr(ag.ref),
				//footerCellTemplate = '<div class="ui-grid-cell-contents text-right">{{ col.colDef.footerValue }}</div>';
			};
			$scope.gridOptions.columnDefs.push(col);
		}

        for (var detailIndex in details) {
            var detail = details[detailIndex];

            var col = {
				name: detail.name,
				field: detail.ref,
				index : detail.ref,
				//cellClass : "text-right",
				//sorttype : "number",
				width : 95, //cubesviewer.views.cube.explore.defineColumnWidth(view, level.key().ref, 85),
				//cellTemplate: '<div class="ui-grid-cell-contents" title="TOOLTIP">{{ col.colDef.formatter(COL_FIELD, row, col) }}</div>',
				//formatter: $scope.columnFormatFunction(ag),
				//footerValue: $scope.columnFormatFunction(ag)(data.summary[ag.ref], null, col)
				//formatoptions: {},
				//cellattr: cubesviewer.views.cube.explore.columnTooltipAttr(ag.ref),
				//footerCellTemplate = '<div class="ui-grid-cell-contents text-right">{{ col.colDef.footerValue }}</div>';
			};
			$scope.gridOptions.columnDefs.push(col);
        }

		// If there are cells, show them
		$scope._addRows(data);



	};


	/*
	 * Draws facts table.
	 */
	this.drawTable = function(view, data) {

		$('#factsTable-' + view.id).jqGrid({
			data: dataRows,
			//userData: dataTotals,
			datatype: "local",
			height: 'auto',
			rowNum: cubesviewer.options.pagingOptions[0],
			rowList: cubesviewer.options.pagingOptions,
			colNames: colNames,
			colModel: colModel,
	        pager: "#factsPager-" + view.id,
	        sortname: cubesviewer.views.cube.explore.defineColumnSort(view, ["key", "desc"])[0],
	        viewrecords: true,
	        sortorder: cubesviewer.views.cube.explore.defineColumnSort(view, ["key", "desc"])[1],
	        //footerrow: true,
	        userDataOnFooter: true,
	        forceFit: false,
	        shrinkToFit: false,
	        width: cubesviewer.options.tableResizeHackMinWidth,
	        //multiselect: true,
	        //multiboxonly: true,

	        //caption: "Current selection data" ,
	        beforeSelectRow : function () { return false; },

			loadComplete : function() {
				// Call hook
				view.cubesviewer.views.cube.explore.onTableLoaded(view);
			},

	        resizeStop: view.cubesviewer.views.cube.explore._onTableResize (view),
			onSortCol: view.cubesviewer.views.cube.explore._onTableSort (view),

	    } );

		this.cubesviewer.views.cube._adjustGridSize();

	};

	/*
	 * Adds rows.
	 */
	$scope._addRows = function(data) {

		var view = $scope.view;
		var rows = $scope.gridData;

		var counter = 0;
		var dimensions = view.cube.dimensions;
		var measures = view.cube.measures;
        var details = view.cube.details;

		$(data).each( function(idx, e) {

			var nid = [];
			var row = [];
			var key = [];

			for ( var dimensionIndex in dimensions) {
				// Get dimension
				var dimension = dimensions[dimensionIndex];

				for (var i = 0; i < dimension.levels.length; i++) {

					var level = dimension.levels[i];
					var levelData = level.readCell (e);

					row[level.key().ref] = levelData.label;

				}
			}

			for (var measureIndex in measures) {
				var measure = measures[measureIndex];
				row[measure.ref] = e[measure.ref];
			}

            for (var detailIndex in details) {
				var detail = details[detailIndex];
				row[detail.ref] = e[detail.ref];
			}

			// Set key
			row["id"] = counter++;
			if ("id" in e) row["id"] = e["id"];
			row["key"] = row["id"];

			rows.push(row);
		});


	};

	$scope.initialize();

}]);



;/*
 * CubesViewer
 * Copyright (c) 2012-2015 Jose Juan Montes, see AUTHORS for more details
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Sof	tware, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * If your version of the Software supports interaction with it remotely through
 * a computer network, the above copyright notice and this permission notice
 * shall be accessible to all users.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */


/**
 * SeriesTable object. This is part of the "cube" view. Allows the user to select
 * a dimension to use as horizontal axis of a table. This is later used to generate
 * charts.
 */
angular.module('cv.views.cube').controller("CubesViewerViewsCubeSeriesController", ['$rootScope', '$scope', '$timeout', 'cvOptions', 'cubesService', 'viewsService',
                                                     function ($rootScope, $scope, $timeout, cvOptions, cubesService, viewsService) {

	$scope.$parent.gridData = [];

	// TODO: Move to explore view or grid component as cube view shall be split into directives
    $scope.$parent.onGridRegisterApi = function(gridApi) {
    	//console.debug("Grid Register Api: Series");
        $scope.gridApi = gridApi;
        gridApi.selection.on.rowSelectionChanged($scope,function(row){
          console.debug(row.entity);
        });
        gridApi.selection.on.rowSelectionChangedBatch($scope,function(rows){
          console.debug(rows);
        });

    };
	$scope.$parent.gridApi = null;
	$scope.$parent.gridOptions = {
		onRegisterApi: $scope.onGridRegisterApi,
		enableRowSelection: false,
		enableRowHeaderSelection: false,
	};


	$scope.initialize = function() {
		$scope.view.params = $.extend(
			{},
			{ "xaxis" : null, "yaxis" : null },
			$scope.view.params
		);
	};

	$scope.$watch("view._cubeDataUpdated", function(newVal) {
		if (newVal) {
			$scope.view._cubeDataUpdated = false;
			$scope.loadData();
		}
	});

	$scope.loadData = function() {

		var view = $scope.view;

		// Check if we can produce a table
		if (view.params.yaxis == null) return;

		var browser_args = cubesService.buildBrowserArgs($scope.view, $scope.view.params.xaxis != null ? true : false, false);
		var browser = new cubes.Browser(cubesService.cubesserver, $scope.view.cube);
		var jqxhr = browser.aggregate(browser_args, $scope._loadDataCallback);
		jqxhr.always(function() {
			//view.cubesviewer.views.unblockView(view);
		});

	};

	$scope._loadDataCallback = function(data, status) {
		$scope.processData(data);
		$rootScope.$apply();
		if ($scope.gridApi) {
			$scope.gridApi.core.refresh();
			$rootScope.$apply();
		}
	};

	$scope.processData = function(data) {

		var view = $scope.view;

		$scope.gridData = [];

		// Configure grid
	    angular.extend($scope.$parent.gridOptions, {
    		data: $scope.gridData,
    		//minRowsToShow: 3,
    		rowHeight: 24,
    		onRegisterApi: $scope.onGridRegisterApi,
    		enableColumnResizing: true,
    		//showColumnFooter: true,
    		enableGridMenu: true,
    		//showGridFooter: true,
    	    paginationPageSizes: cvOptions.pagingOptions,
    	    paginationPageSize: cvOptions.pagingOptions[0],
    		//enableHorizontalScrollbar: 0,
    		//enableVerticalScrollbar: 0,
    		enableRowSelection: false,
    		enableRowHeaderSelection: false,
    		//enableSelectAll: false,
    		enablePinning: false,
    		multiSelect: false,
    		selectionRowHeaderWidth: 20,
    		//rowHeight: 50,
    		columnDefs: []
	    });		$rootScope.$apply();


		// Process data
		//$scope._sortData (data.cells, view.params.xaxis != null ? true : false);
	    $scope._addRows(data);

	    /*
	    // TODO: Is this needed?

		colNames.forEach(function (e) {
			var colLabel = null;
			$(view.cube.aggregates).each(function (idx, ag) {
				if (ag.name == e) {
					colLabel = ag.label||ag.name;
					return false;
				}
			});
			if (!colLabel) {
				$(view.cube.measures).each(function (idx, me) {
					if (me.name == e) {
						colLabel = me.label||ag.name;
						return false;
					}
				});
			}
			//colLabel = view.cube.getDimension(e).label
			colLabels.push(colLabel||e);
		});
		*/

	};


	/*
	 * Adds rows.
	 */
	$scope._addRows = function(data) {

		var view = $scope.view;
		var rows = $scope.gridData;

		var counter = 0;
		var dimensions = view.cube.dimensions;
		var measures = view.cube.measures;
        var details = view.cube.details;

		// Copy drilldown as we'll modify it
		var drilldown = view.params.drilldown.slice(0);

		// Include X Axis if necessary
		if (view.params.xaxis != null) {
			drilldown.splice(0,0, view.params.xaxis);
		}
		var baseidx = ((view.params.xaxis == null) ? 0 : 1);

		var addedCols = [];
		$(data.cells).each(function (idx, e) {

			var row = [];
			var key = [];

			// For the drilldown level, if present
			for (var i = 0; i < drilldown.length; i++) {

				// Get dimension
				var parts = view.cube.cvdim_parts(drilldown[i]);
				var infos = parts.hierarchy.readCell(e, parts.level);

				// Values and Labels
				var drilldown_level_values = [];
				var drilldown_level_labels = [];

				$(infos).each(function(idx, info) {
					drilldown_level_values.push (info.key);
					drilldown_level_labels.push (info.label);
				});

				key.push (drilldown_level_labels.join(" / "));

			}

			// Set key
			var colKey = (view.params.xaxis == null) ? view.params.yaxis : key[0];
			var value = (e[view.params.yaxis]);
			var rowKey = (view.params.xaxis == null) ? key.join (' / ') : key.slice(1).join (' / ');

			// Search or introduce
			var row = $.grep(rows, function(ed) { return ed["key"] == rowKey; });
			if (row.length > 0) {
				row[0][colKey] = value;
			} else {
				var newrow = {};
				newrow["key"] = rowKey;
				newrow[colKey] = value;

				for (var i = baseidx ; i < key.length; i++) {
					newrow["key" + (i - baseidx)] = key[i];
				}
				rows.push ( newrow );
			}


			// Add column definition if the column hasn't been added yet
			if (addedCols.indexOf(colKey) < 0) {
				addedCols.push(colKey);

				var ag = $.grep(view.cube.aggregates, function(ag) { return ag.ref == view.params.yaxis })[0];

				var col = {
					name: colKey,
					field: colKey,
					index : colKey,
					cellClass : "text-right",
					sorttype : "number",
					width : 75, //cubesviewer.views.cube.explore.defineColumnWidth(view, colKey, 75),
					cellTemplate: '<div class="ui-grid-cell-contents" title="TOOLTIP">{{ col.colDef.formatter(COL_FIELD, row, col) }}</div>',
					formatter: $scope.columnFormatFunction(ag),
					//footerValue: $scope.columnFormatFunction(ag)(data.summary[ag.ref], null, col)
					//formatoptions: {},
					//cellattr: cubesviewer.views.cube.explore.columnTooltipAttr(ag.ref),
					//footerCellTemplate = '<div class="ui-grid-cell-contents text-right">{{ col.colDef.footerValue }}</div>';
				};
				$scope.gridOptions.columnDefs.push(col);
			}
		});

		//var label = [];
		$(view.params.drilldown).each (function (idx, e) {
			var col = {
				name: view.cube.cvdim_dim(e).label,
				field: "key" + idx,
				index : "key" + idx,
				//cellClass : "text-right",
				//sorttype : "number",
				width : 190, //cubesviewer.views.cube.explore.defineColumnWidth(view, "key" + idx, 190)
				//cellTemplate: '<div class="ui-grid-cell-contents" title="TOOLTIP">{{ col.colDef.formatter(COL_FIELD, row, col) }}</div>',
				//formatter: $scope.columnFormatFunction(ag),
				//footerValue: $scope.columnFormatFunction(ag)(data.summary[ag.ref], null, col)
				//formatoptions: {},
				//cellattr: cubesviewer.views.cube.explore.columnTooltipAttr(ag.ref),
				//footerCellTemplate = '<div class="ui-grid-cell-contents text-right">{{ col.colDef.footerValue }}</div>';
			};
			$scope.gridOptions.columnDefs.splice(idx, 0, col);
		});

		if (view.params.drilldown.length == 0 && rows.length > 0) {
			rows[0]["key0"] = view.params.yaxis;

			var col = {
				name: "Measure",
				field: "key0",
				index : "key0",
				//cellClass : "text-right",
				//sorttype : "number",
				width : 190, //cubesviewer.views.cube.explore.defineColumnWidth(view, "key0", 190)
				//cellTemplate: '<div class="ui-grid-cell-contents" title="TOOLTIP">{{ col.colDef.formatter(COL_FIELD, row, col) }}</div>',
				//formatter: $scope.columnFormatFunction(ag),
				//footerValue: $scope.columnFormatFunction(ag)(data.summary[ag.ref], null, col)
				//formatoptions: {},
				//cellattr: cubesviewer.views.cube.explore.columnTooltipAttr(ag.ref),
				//footerCellTemplate = '<div class="ui-grid-cell-contents text-right">{{ col.colDef.footerValue }}</div>';
			};
			$scope.gridOptions.columnDefs.splice(0, 0, col);
		}

	};

	$scope.initialize();

}]);

;/*
 * CubesViewer
 * Copyright (c) 2012-2016 Jose Juan Montes, see AUTHORS for more details
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * If your version of the Software supports interaction with it remotely through
 * a computer network, the above copyright notice and this permission notice
 * shall be accessible to all users.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

'use strict';

/*
 * Series chart object. Contains view functions for the 'chart' mode.
 * This is an optional component, part of the cube view.
 */

angular.module('cv.views.cube').controller("CubesViewerViewsCubeChartController", ['$rootScope', '$scope', '$timeout', '$element', 'cvOptions', 'cubesService', 'viewsService',
                                                     function ($rootScope, $scope, $timeout, $element, cvOptions, cubesService, viewsService) {

	$scope.$parent.gridData = [];
	$scope.$parent.gridApi = null;
	$scope.$parent.gridOptions = { data: $scope.$parent.gridData, columnDefs: [] };

	$scope.chart = null;


	$scope.initialize = function() {
		// Add chart view parameters to view definition
		$scope.view.params = $.extend(
			{},
			{ "charttype" : "bars-vertical", "chartoptions": { showLegend: true } },
			$scope.view.params
		);
	};

	$scope.$watch("view._cubeDataUpdated", function(newVal) {
		if (newVal) {
			$scope.view._cubeDataUpdated = false;
			$scope.loadData();
		}
	});

	$scope.loadData = function() {

		var view = $scope.view;

		// Check if we can produce a table
		if (view.params.yaxis == null) return;

		var browser_args = cubesService.buildBrowserArgs($scope.view, $scope.view.params.xaxis != null ? true : false, false);
		var browser = new cubes.Browser(cubesService.cubesserver, $scope.view.cube);
		var jqxhr = browser.aggregate(browser_args, $scope._loadDataCallback);
		jqxhr.always(function() {
			//view.cubesviewer.views.unblockView(view);
		});

	};

	$scope._loadDataCallback = function(data, status) {
		$scope.processData(data);
		$rootScope.$apply();
	};

	$scope.processData = function(data) {

		$scope.gridData = [];
		$scope.gridOptions.data = $scope.gridData;
		$scope.gridOptions.columnDefs = [];

		var view = $scope.view;
		var rows = $scope.gridData;
		var columnDefs = $scope.gridOptions.columnDefs;

		// Process data
		//$scope._sortData (data.cells, view.params.xaxis != null ? true : false);
	    $scope._addRows(data);

		// Join keys
		if (view.params.drilldown.length > 0) {
			columnDefs.splice (0, view.params.drilldown.length, {
				name: "key"
			});

			$(rows).each(function(idx, e) {
				var jointkey = [];
				for (var i = 0; i < view.params.drilldown.length; i++) jointkey.push(e["key" + i]);
				e["key"] = jointkey.join(" / ");
			});
		}

		$scope.$broadcast("GridDataUpdated");

	};

	/*
	 * Adds rows.
	 */
	$scope._addRows = function(data) {

		console.debug("FIXME: addRows method in charts controller is duplicated (from series controller)!")

		var view = $scope.view;
		var rows = $scope.gridData;

		var counter = 0;
		var dimensions = view.cube.dimensions;
		var measures = view.cube.measures;
        var details = view.cube.details;

		// Copy drilldown as we'll modify it
		var drilldown = view.params.drilldown.slice(0);

		// Include X Axis if necessary
		if (view.params.xaxis != null) {
			drilldown.splice(0,0, view.params.xaxis);
		}
		var baseidx = ((view.params.xaxis == null) ? 0 : 1);

		var addedCols = [];
		$(data.cells).each(function (idx, e) {

			var row = [];
			var key = [];

			// For the drilldown level, if present
			for (var i = 0; i < drilldown.length; i++) {

				// Get dimension
				var parts = view.cube.cvdim_parts(drilldown[i]);
				var infos = parts.hierarchy.readCell(e, parts.level);

				// Values and Labels
				var drilldown_level_values = [];
				var drilldown_level_labels = [];

				$(infos).each(function(idx, info) {
					drilldown_level_values.push (info.key);
					drilldown_level_labels.push (info.label);
				});

				key.push (drilldown_level_labels.join(" / "));

			}

			// Set key
			var colKey = (view.params.xaxis == null) ? view.params.yaxis : key[0];
			var value = (e[view.params.yaxis]);
			var rowKey = (view.params.xaxis == null) ? key.join (' / ') : key.slice(1).join (' / ');

			// Search or introduce
			var row = $.grep(rows, function(ed) { return ed["key"] == rowKey; });
			if (row.length > 0) {
				row[0][colKey] = value;
			} else {
				var newrow = {};
				newrow["key"] = rowKey;
				newrow[colKey] = value;

				for (var i = baseidx ; i < key.length; i++) {
					newrow["key" + (i - baseidx)] = key[i];
				}
				rows.push ( newrow );
			}


			// Add column definition if the column hasn't been added yet
			if (addedCols.indexOf(colKey) < 0) {
				addedCols.push(colKey);

				var ag = $.grep(view.cube.aggregates, function(ag) { return ag.ref == view.params.yaxis })[0];

				var col = {
					name: colKey,
					field: colKey,
					index : colKey,
					cellClass : "text-right",
					sorttype : "number",
					width : 75, //cubesviewer.views.cube.explore.defineColumnWidth(view, colKey, 75),
					cellTemplate: '<div class="ui-grid-cell-contents" title="TOOLTIP">{{ col.colDef.formatter(COL_FIELD, row, col) }}</div>',
					formatter: $scope.columnFormatFunction(ag),
					//footerValue: $scope.columnFormatFunction(ag)(data.summary[ag.ref], null, col)
					//formatoptions: {},
					//cellattr: cubesviewer.views.cube.explore.columnTooltipAttr(ag.ref),
					//footerCellTemplate = '<div class="ui-grid-cell-contents text-right">{{ col.colDef.footerValue }}</div>';
				};
				$scope.gridOptions.columnDefs.push(col);
			}
		});

		//var label = [];data
		$(view.params.drilldown).each (function (idx, e) {
			var col = {
				name: view.cube.cvdim_dim(e).label,
				field: "key" + idx,
				index : "key" + idx,
				//cellClass : "text-right",
				//sorttype : "number",
				width : 190, //cubesviewer.views.cube.explore.defineColumnWidth(view, "key" + idx, 190)
				//cellTemplate: '<div class="ui-grid-cell-contents" title="TOOLTIP">{{ col.colDef.formatter(COL_FIELD, row, col) }}</div>',
				//formatter: $scope.columnFormatFunction(ag),
				//footerValue: $scope.columnFormatFunction(ag)(data.summary[ag.ref], null, col)
				//formatoptions: {},
				//cellattr: cubesviewer.views.cube.explore.columnTooltipAttr(ag.ref),
				//footerCellTemplate = '<div class="ui-grid-cell-contents text-right">{{ col.colDef.footerValue }}</div>';
			};
			$scope.gridOptions.columnDefs.splice(idx, 0, col);
		});

		if (view.params.drilldown.length == 0 && rows.length > 0) {
			rows[0]["key0"] = view.params.yaxis;

			var col = {
				name: "Measure",
				field: "key0",
				index : "key0",
				//cellClass : "text-right",
				//sorttype : "number",
				width : 190, //cubesviewer.views.cube.explore.defineColumnWidth(view, "key0", 190)
				//cellTemplate: '<div class="ui-grid-cell-contents" title="TOOLTIP">{{ col.colDef.formatter(COL_FIELD, row, col) }}</div>',
				//formatter: $scope.columnFormatFunction(ag),
				//footerValue: $scope.columnFormatFunction(ag)(data.summary[ag.ref], null, col)
				//formatoptions: {},
				//cellattr: cubesviewer.views.cube.explore.columnTooltipAttr(ag.ref),
				//footerCellTemplate = '<div class="ui-grid-cell-contents text-right">{{ col.colDef.footerValue }}</div>';
			};
			$scope.gridOptions.columnDefs.splice(0, 0, col);
		}

	};

	$scope.cleanupNvd3 = function() {

		$($element).find("svg").empty();
		$($element).find("svg").parent().children().not("svg").remove();
		$("div.nvtooltip").remove();
		$scope.chart = null;
		console.debug("FIXME: Cleanup function: destroy nvd3 events?");

		/*
		var len = nv.graphs.length;
		while (len--) {
			if (! ($.contains(document.documentElement, nv.graphs[len].container))) {
			    // Element is detached, destroy graph
				nv.graphs.splice (len,1);
			}
		}
		*/
	};

	$scope.resizeChart = function(size) {
		var view = $scope.view;
		$($element).find('svg').height(size);
		$($element).find('svg').resize();

		if ($scope.chart) $scope.chart.update();
	};

	$scope.$on("$destroy", function() {
		$scope.cleanupNvd3();
	});

	$scope.initialize();

}]);


;/*
 * CubesViewer
 * Copyright (c) 2012-2016 Jose Juan Montes, see AUTHORS for more details
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * If your version of the Software supports interaction with it remotely through
 * a computer network, the above copyright notice and this permission notice
 * shall be accessible to all users.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

/*
 * Series chart object. Contains view functions for the 'chart' mode.
 * This is an optional component, part of the cube view.
 */
angular.module('cv.views.cube').controller("CubesViewerViewsCubeChartBarsVerticalController", ['$rootScope', '$scope', '$element', '$timeout', 'cvOptions', 'cubesService', 'viewsService',
                                                     function ($rootScope, $scope, $element, $timeout, cvOptions, cubesService, viewsService) {

	$scope.chart = null;

	$scope.initialize = function() {
	};

	$scope.$on('GridDataUpdated', function() {
		console.debug("Grid data ready: draw bars vertical.");
		$scope.cleanupNvd3();
		$timeout(function() {
			$scope.drawChartBarsVertical();
		}, 0);
	});

	/**
	 * Draws a vertical bars chart.
	 */
	$scope.drawChartBarsVertical = function () {

		var view = $scope.view;
		var dataRows = $scope.gridData;
		var columnDefs = $scope.gridOptions.columnDefs;

		console.debug(dataRows);
		console.debug(columnDefs);

		var container = $($element).find("svg").get(0);
		var xAxisLabel = ( (view.params.xaxis != null) ? view.cube.cvdim_parts(view.params.xaxis).label : "None")

	    var d = [];

	    var numRows = dataRows.length;
	    var serieCount = 0;
	    $(dataRows).each(function(idx, e) {
	    	serie = [];
	    	for (var i = 1; i < columnDefs.length; i++) {
	    		var value = e[columnDefs[i].name];
	    		serie.push( { "x": columnDefs[i].name, "y":  (value != undefined) ? value : 0 } );
	    	}
	    	var series = { "values": serie, "key": e["key"] != "" ? e["key"] : view.params.yaxis };
	    	if (view.params["chart-disabledseries"]) {
	    		if (view.params["chart-disabledseries"]["key"] == (view.params.drilldown.join(","))) {
	    			series.disabled = !! view.params["chart-disabledseries"]["disabled"][series.key];
	    		}
	    	}
	    	d.push(series);
	    	serieCount++;
	    });
	    d.sort(function(a,b) { return a.key < b.key ? -1 : (a.key > b.key ? +1 : 0) });

	    /*
	    xticks = [];
	    for (var i = 1; i < colNames.length; i++) {
    		xticks.push([ i * 10, colNames[i] ]);
	    }
	    */

	    chartOptions = {
	    	  //barColor: d3.scale.category20().range(),
	    	  delay: 1200,
	    	  groupSpacing: 0.1,
	    	  //reduceXTicks: false,
	    	  //staggerLabels: true
	    };

	    var ag = $.grep(view.cube.aggregates, function(ag) { return ag.ref == view.params.yaxis })[0];
		var colFormatter = $scope.columnFormatFunction(ag);

	    nv.addGraph(function() {
	        var chart;
	        chart = nv.models.multiBarChart()
		          //.margin({bottom: 100})
		          .showLegend(!!view.params.chartoptions.showLegend)
		          .margin({left: 120});

	    	if (view.params["chart-barsvertical-stacked"]) {
	    		chart.stacked ( view.params["chart-barsvertical-stacked"] );
	    	}

	        chart.options(chartOptions);
	        chart.multibar.hideable(true);

	        //chart.xAxis.axisLabel(xAxisLabel).showMaxMin(true).tickFormat(d3.format(',0f'));
	        chart.xAxis.axisLabel(xAxisLabel);

	        //chart.yAxis.tickFormat(d3.format(',.2f'));
	        chart.yAxis.tickFormat(function(d,i) {
	        	return colFormatter(d);
	        });

	        d3.select(container)
	            .datum(d)
	            .call(chart);

	        nv.utils.windowResize(chart.update);

    	    // Handler for state change
            chart.dispatch.on('stateChange', function(newState) {
            	view.params["chart-barsvertical-stacked"] = newState.stacked;
            	view.params["chart-disabledseries"] = {
        			  "key": view.params.drilldown.join(","),
        			  "disabled": {}
            	};
            	for (var i = 0; i < newState.disabled.length; i++) {
            		view.params["chart-disabledseries"]["disabled"][d[i]["key"]] =  newState.disabled[i];
            	}
            });

	        //chart.dispatch.on('stateChange', function(e) { nv.log('New State:', JSON.stringify(e)); });

            $scope.$parent.$parent.chart = chart;

	        return chart;

	    });

	}

	$scope.initialize();

}]);


;/*
 * CubesViewer
 * Copyright (c) 2012-2016 Jose Juan Montes, see AUTHORS for more details
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * If your version of the Software supports interaction with it remotely through
 * a computer network, the above copyright notice and this permission notice
 * shall be accessible to all users.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

/*
 * Series chart object. Contains view functions for the 'chart' mode.
 * This is an optional component, part of the cube view.
 */
angular.module('cv.views.cube').controller("CubesViewerViewsCubeChartLinesController", ['$rootScope', '$scope', '$element', '$timeout', 'cvOptions', 'cubesService', 'viewsService',
                                                     function ($rootScope, $scope, $element, $timeout, cvOptions, cubesService, viewsService) {

	$scope.chart = null;

	$scope.initialize = function() {
	};

	$scope.$on('GridDataUpdated', function() {
		$scope.cleanupNvd3();
		$timeout(function() {
			$scope.drawChartLines();
		}, 0);
	});


	/**
	 * Draws a vertical bars chart.
	 */
	$scope.drawChartLines = function () {

		var view = $scope.view;
		var dataRows = $scope.gridData;
		var columnDefs = $scope.gridOptions.columnDefs;

		var container = $($element).find("svg").get(0);

		var xAxisLabel = ( (view.params.xaxis != null) ? view.cube.cvdim_parts(view.params.xaxis).label : "None")


	    // TODO: Check there's only one value column

		var d = [];
	    var numRows = dataRows.length;
	    var serieCount = 0;
	    $(dataRows).each(function(idx, e) {
	    	serie = [];
	    	for (var i = 1; i < columnDefs.length; i++) {
	    		if (columnDefs[i].field in e) {
	    			var value = e[columnDefs[i].field];
	    			serie.push( { "x": i, "y":  (value != undefined) ? value : 0 } );
	    		} else  {
	    			if (view.params.charttype == "lines-stacked") {
	    				serie.push( { "x": i, "y":  0 } );
	    			}
	    		}
	    	}
	    	var series = { "values": serie, "key": e["key"] != "" ? e["key"] : view.params.yaxis };
	    	if (view.params["chart-disabledseries"]) {
	    		if (view.params["chart-disabledseries"]["key"] == (view.params.drilldown.join(","))) {
	    			series.disabled = !! view.params["chart-disabledseries"]["disabled"][series.key];
	    		}
	    	}
	    	console.debug(series);
	    	d.push(series);
	    	serieCount++;
	    });
	    d.sort(function(a,b) { return a.key < b.key ? -1 : (a.key > b.key ? +1 : 0) });

	    /*
	    xticks = [];
	    for (var i = 1; i < colNames.length; i++) {
    		xticks.push([ i, colNames[i] ]);
	    }
	    */

	    var ag = $.grep(view.cube.aggregates, function(ag) { return ag.ref == view.params.yaxis })[0];
	    var colFormatter = $scope.columnFormatFunction(ag);

	    if (view.params.charttype != "lines-stacked") {

		    nv.addGraph(function() {
		    	var chart = nv.models.lineChart()
		    		.useInteractiveGuideline(true)
		    		.showLegend(!!view.params.chartoptions.showLegend)
		    		.margin({left: 120});

		    	chart.xAxis
		    		.axisLabel(xAxisLabel)
		    		.tickFormat(function(d,i) {
		    			return (columnDefs[d].name);
				    });

	    		chart.yAxis.tickFormat(function(d,i) {
		        	return colFormatter(d);
		        });

		    	d3.select(container)
		    		.datum(d)
		    		.call(chart);

		    	nv.utils.windowResize(chart.update);

		    	  // Handler for state change
		          chart.dispatch.on('stateChange', function(newState) {
		        	  view.params["chart-disabledseries"] = {
		        			  "key": view.params.drilldown.join(","),
		        			  "disabled": {}
		        	  };
		        	  for (var i = 0; i < newState.disabled.length; i++) {
		        		  view.params["chart-disabledseries"]["disabled"][d[i]["key"]] =  newState.disabled[i];
		        	  }
		          });

		        $scope.$parent.$parent.chart = chart;
		    	return chart;
		    });

	    } else {

		    nv.addGraph(function() {
	    	  var chart = nv.models.stackedAreaChart()
	    	                //.x(function(d) { return d[0] })
	    	                //.y(function(d) { return "y" in d ? d.y : 0 })
	    	  				.showLegend(!!view.params.chartoptions.showLegend)
	    	  				.margin({left: 130})
	    	                .clipEdge(true)
	    	                .useInteractiveGuideline(true);

	    	  if (	view.params["chart-stackedarea-style"] ) {
	    		  chart.style ( view.params["chart-stackedarea-style"] );
	    	  }

	    	  chart.xAxis	        //chart.xAxis.axisLabel(xAxisLabel).showMaxMin(true).tickFormat(d3.format(',0f'));
	    	  	  .axisLabel(xAxisLabel)
	    	      .showMaxMin(false)
	    	      .tickFormat(function(d, i) {
	    	    	  return (columnDefs[d].name);
			      });

	    	  chart.yAxis.tickFormat(function(d,i) {
	    		  return colFormatter(d);
	    	  });

	    	  d3.select(container)
	    	  	  .datum(d)
	    	      .call(chart);

	    	  nv.utils.windowResize(chart.update);

	    	  // Handler for state change
	          chart.dispatch.on('stateChange', function(newState) {
	        	  view.params["chart-stackedarea-style"] = newState.style;
	        	  view.params["chart-disabledseries"] = {
	        			  "key": view.params.drilldown.join(","),
	        			  "disabled": {}
	        	  };
	        	  for (var i = 0; i < newState.disabled.length; i++) {
	        		  view.params["chart-disabledseries"]["disabled"][d[i]["key"]] =  newState.disabled[i];
	        	  }
	          });

	          $scope.$parent.$parent.chart = chart;
	    	  return chart;
	    	});
	    }

	};



	/**
	 */
	/*
	this.drawChartLinesCumulative = function (view, colNames, dataRows, dataTotals) {

		var container = $('#seriesChart-' + view.id).find("svg").get(0);
		var xAxisLabel = ( (view.params.xaxis != null) ? view.cube.getDimensionParts(view.params.xaxis).label : "None")

	    var d = [];


	    numRows = dataRows.length;
	    var serieCount = 1;
	    $(dataRows).each(function(idx, e) {
	    	serie = [];
	    	for (var i = 1; i < colNames.length; i++) {
	    		if ( (colNames[i] in e) && (e[colNames[i]] != null) && (e[colNames[i]]) ) {
	    			var value = e[colNames[i]];
	    			serie.push( { "x": i, "y": parseFloat(value) } );
	    		} else {
	    			serie.push( { "x": i, "y": 0 } );
	    		}
	    	}
	    	d.push({ "values": serie, "key": e["key"] != "" ? e["key"] : view.params.yaxis });
	    });
	    d.sort(function(a,b) { return a.key < b.key ? -1 : (a.key > b.key ? +1 : 0) });

	    nv.addGraph(function() {
	        var chart = nv.models.cumulativeLineChart()
                          //.x(function(d) { return d.x })
		                  //.y(function(d) { return d.y })
		                  .showLegend(!!view.params.chartoptions.showLegend)
		                  .color(d3.scale.category20().range())
	                      //.color(d3.scale.category10().range())
		                  .useInteractiveGuideline(true)
	                      ;

	         chart.xAxis
	            .axisLabel(xAxisLabel)
			      .tickFormat(function(d,i) {
			                return (colNames[d]);
			       })	;

	         chart.yAxis
	         .tickFormat(d3.format(',.2f'));

	        d3.select(container)
	            .datum(d)
	          .transition().duration(500)
	            .call(chart);

    	  // Handler for state change
	          chart.dispatch.on('stateChange', function(newState) {
	        	  view.params["chart-stackedarea-style"] = newState.style;
	        	  view.params["chart-disabledseries"] = {
	        			  "key": view.params.drilldown.join(","),
	        			  "disabled": newState.disabled
	        	  };
	          });

	        //TODO: Figure out a good way to do this automatically
	        nv.utils.windowResize(chart.update);

	        return chart;
      });

	};
	*/


	$scope.initialize();

}]);


;/*
 * CubesViewer
 * Copyright (c) 2012-2016 Jose Juan Montes, see AUTHORS for more details
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * If your version of the Software supports interaction with it remotely through
 * a computer network, the above copyright notice and this permission notice
 * shall be accessible to all users.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

/*
 * Series chart object. Contains view functions for the 'chart' mode.
 * This is an optional component, part of the cube view.
 */
angular.module('cv.views.cube').controller("CubesViewerViewsCubeChartPieController", ['$rootScope', '$scope', '$element', '$timeout', 'cvOptions', 'cubesService', 'viewsService',
                                                     function ($rootScope, $scope, $element, $timeout, cvOptions, cubesService, viewsService) {

	$scope.chart = null;

	$scope.initialize = function() {
	};

	$scope.$on('GridDataUpdated', function() {
		$scope.cleanupNvd3();
		$timeout(function() {
			$scope.drawChartPie();
		}, 0);
	});

	/**
	 */
	$scope.drawChartPie = function () {

		var view = $scope.view;
		var dataRows = $scope.gridData;
		var columnDefs = $scope.gridOptions.columnDefs;

		var container = $($element).find("svg").get(0);

		var xAxisLabel = ( (view.params.xaxis != null) ? view.cube.cvdim_parts(view.params.xaxis).label : "None")

	    var d = [];

	    var numRows = dataRows.length;
	    var serieCount = 0;
	    $(dataRows).each(function(idx, e) {
	    	serie = [];
	    	var value = e[columnDefs[1].field];
    		if ((value != undefined) && (value > 0)) {

    	    	var series = { "y": value, "key": e["key"] != "" ? e["key"] : columnDefs[0].name };
    	    	if (view.params["chart-disabledseries"]) {
    	    		if (view.params["chart-disabledseries"]["key"] == (view.params.drilldown.join(","))) {
    	    			series.disabled = !! view.params["chart-disabledseries"]["disabled"][series.key];
    	    		}
    	    	}

    	    	d.push(series);
    			serieCount++;

    		}

	    });
	    d.sort(function(a,b) { return a.y < b.y ? -1 : (a.y > b.y ? +1 : 0) });

	    xticks = [];
	    for (var i = 1; i < columnDefs.length; i++) {
    		xticks.push([ i - 1, columnDefs[i].name ]);
	    }

	    var ag = $.grep(view.cube.aggregates, function(ag) { return ag.ref == view.params.yaxis })[0];
	    var colFormatter = $scope.columnFormatFunction(ag);

	    nv.addGraph(function() {

	        var chart = nv.models.pieChart()
	            .x(function(d) { return d.key })
	            .y(function(d) { return d.y })
	            .showLegend(!!view.params.chartoptions.showLegend)
	            //.color(d3.scale.category20().range())
	            //.width(width)
	            //.height(height)
	            .labelType("percent");
	            //.donut(true);

	        /*
		    chart.pie
		        .startAngle(function(d) { return d.startAngle/2 -Math.PI/2 })
		        .endAngle(function(d) { return d.endAngle/2 -Math.PI/2 });
		        */

	        chart.valueFormat(function(d,i) {
	        	return colFormatter(d);
	        });

	        d3.select(container)
	              .datum(d)
	              //.attr('width', width)
	              //.attr('height', height)
	              .call(chart);

	        nv.utils.windowResize(chart.update);

	    	// Handler for state change
	        chart.dispatch.on('stateChange', function(newState) {
	        	view.params["chart-disabledseries"] = {
	        			"key": view.params.drilldown.join(","),
	        			"disabled": {}
	        	};
	        	for (var i = 0; i < newState.disabled.length; i++) {
	        		view.params["chart-disabledseries"]["disabled"][d[i]["key"]] =  newState.disabled[i];
	        	}
	        });

	        $scope.$parent.$parent.chart = chart;
	        return chart;
	    });

	};

	$scope.initialize();

}]);


;/*
 * CubesViewer
 * Copyright (c) 2012-2016 Jose Juan Montes, see AUTHORS for more details
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * If your version of the Software supports interaction with it remotely through
 * a computer network, the above copyright notice and this permission notice
 * shall be accessible to all users.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */


angular.module('cv.studio', ['ui.bootstrap', 'cv' /*'ui.bootstrap-slider', 'ui.validate', 'ngAnimate', */
                             /*'angularMoment', 'smart-table', 'angular-confirm', 'debounce', 'xeditable',
                             'nvd3' */ ]);


angular.module('cv.studio').service("studioViewsService", ['$rootScope', 'cvOptions', 'cubesService', 'viewsService',
                                                            function ($rootScope, cvOptions, cubesService, viewsService) {

	this.views = [];

	this.lastViewId = 0;

	/**
	 * Adds a new clean view for a cube
	 */
	this.addViewCube = function(cubename) {

		this.lastViewId++;
		var viewId = "view" + this.lastViewId;


		// Find cube name
		var cubeinfo = cubesService.cubesserver.cubeinfo(cubename);

		//var container = this.createContainer(viewId);
		//$('.cv-gui-viewcontent', container),

		var view = viewsService.createView(viewId, "cube", { "cubename": cubename, "name": cubeinfo.label + " (" + this.lastViewId + ")"});
		this.views.push(view);

		return view;
	};

	/**
	 * Closes the panel of the given view.
	 */
	this.closeView = function(view) {
		var viewIndex = this.views.indexOf(view);
		if (viewIndex >= 0) {
			this.views.splice(viewIndex, 1);
		}
	};

	/**
	 * Collapses the panel of the given view.
	 */
	this.toggleCollapseView = function(view) {
		view.collapsed = !view.collapsed;
	};

}]);


/**
 * cvStudioView directive. Shows a Studio panel containing the corresponding view.
 */
angular.module('cv.studio').controller("CubesViewerStudioViewController", ['$rootScope', '$scope', 'cvOptions', 'cubesService', 'studioViewsService',
                                                     function ($rootScope, $scope, cvOptions, cubesService, studioViewsService) {

	$scope.studioViewsService = studioViewsService;

}]).directive("cvStudioView", function() {
	return {
		restrict: 'A',
		templateUrl: 'studio/panel.html',
		scope: {
			view: "="
		}

	};
});



angular.module('cv.studio').controller("CubesViewerStudioController", ['$rootScope', '$scope', 'cvOptions', 'cubesService', 'studioViewsService',
                                                                       function ($rootScope, $scope, cvOptions, cubesService, studioViewsService) {

	$scope.cvVersion = cubesviewer.version;
	$scope.cvOptions = cvOptions;
	$scope.cubesService = cubesService;
	$scope.studioViewsService = studioViewsService;

	// Current views array
	this.views = [];

	// View counter (used to assign different ids to each spawned view)
	this.lastViewId = 0;


	/**
	 * Closes a view.
	 */
	$scope.closeView = function(view) {
		for ( var i = 0; (i < this.views.length) && (this.views[i].id != view.id); i++) ;

		$('#' + view.id).remove();
		this.views.splice(i, 1);

		cubesviewer.views.destroyView (view);
	};



	/*
	 * Adds a view given its params descriptor.
	 */
	$scope.addViewObject = function(data) {

		this.lastViewId++;
		var viewId = "view" + this.lastViewId;

		var container = this.createContainer(viewId);
		var view = this.cubesviewer.views.createView(viewId, $('.cv-gui-viewcontent', container), "cube", data);
		this.views.push (view);

		// Bind close button
		$(container).find('.cv-gui-closeview').click(function() {
			cubesviewer.gui.closeView(view);
			return false;
		});

		return view;

	};

	/*
	 * Creates a container for a view.
	 */
	this.createContainer = function(viewId) {

		// Configure collapsible
		/*
		$('#' + viewId + " .cv-gui-cubesview").accordion({
			collapsible : true,
			autoHeight : false
		});
		$('#' + viewId + " .cv-gui-viewcontent").css({
			"height": ""
		});
		$('#' + viewId + " .cv-gui-cubesview").on("accordionbeforeactivate", function (evt, ui) {
			if (cubesviewer.gui._sorting == true) {
				evt.preventDefault();
				evt.stopImmediatePropagation();
			}
		});
		*/

		return $('#' + viewId);
	};

	/*
	 * Updates view information in the container when a view is refreshed
	 */
	this.onViewDraw = function (event, view) {

		var container = $(view.container).parents('.cv-gui-cubesview');
		$('.cv-gui-container-name', container).empty().text(view.params.name);

		view.cubesviewer.gui.drawMenu(view);
	}

	/*
	 * Draw cube view menu
	 */
	this.drawMenu = function(view) {

		// Add panel menu options button
		$(view.container).find('.cv-view-toolbar').append(
			'<button class="panelbutton" title="Panel">Panel</button>'
		);

		$(view.container).find('.cv-view-viewmenu').append(
			'<ul class="cv-view-menu cv-view-menu-panel" style="float: right; width: 180px;"></ul>'
		);

		// Buttonize
		$(view.container).find('.panelbutton').button();


		var menu = $(".cv-view-menu-panel", $(view.container));
		menu.append(
			'<li><a class="cv-gui-cloneview" href="#"><span class="ui-icon ui-icon-copy"></span>Clone</a></li>' +
			'<li><a class="cv-gui-renameview" href="#"><span class="ui-icon ui-icon-pencil"></span>Rename...</a></li>' +
			'<div></div>' +
			'<li><a class="cv-gui-closeview" href="#"><span class="ui-icon ui-icon-close"></span>Close</a></li>'
		);

		// Menu functionality
		view.cubesviewer.views.cube._initMenu(view, '.panelbutton', '.cv-view-menu-panel');

		$(view.container).find('.cv-gui-closeview').unbind("click").click(function() {
			cubesviewer.gui.closeView(view);
			return false;
		});
		$(view.container).find('.cv-gui-renameview').unbind("click").click(function() {
			cubesviewer.gui.renameView(view);
			return false;
		});
		$('#' + view.id).find('.cv-gui-container-name').unbind("dblclick").dblclick(function() {
			cubesviewer.gui.renameView(view);
			return false;
		});
		$(view.container).find('.cv-gui-cloneview').unbind("click").click(function() {
			cubesviewer.gui.cloneView(view);
			return false;
		});


	}

	/*
	 * Renames a view (this is the user-defined label that is shown in the GUI header).
	 */
	this.renameView = function(view) {

		var newname = prompt("Enter new view name:", view.params.name);

		// TODO: Validate name

		if ((newname != null) && (newname != "")) {
			view.params.name = newname;
			cubesviewer.views.redrawView(view);
		}

	};

	/*
	 * Clones a view.
	 * This uses the serialization facility.
	 */
	this.cloneView = function(view) {

		viewobject = $.parseJSON(view.cubesviewer.views.serialize(view));
		viewobject.name = "Clone of " + viewobject.name;

		var view = this.addViewObject(viewobject);

		// TODO: These belong to plugins
		view.savedId = 0;
		view.owner = this.options.user;
		view.shared = false;

		this.cubesviewer.views.redrawView (view);
	};

	// Model Loaded Event (redraws cubes list)
	this.onCubesViewerInitialized = function() {
		cubesviewer.gui.drawCubesList();
	};


	this.drawCubesList = function() {

		// Add handlers for clicks
		$('.cv-gui-cubeslist-menu', $(cubesviewer.gui.options.container)).find('.cv-gui-addviewcube').click(function() {
			var view = cubesviewer.gui.addViewCube(  $(this).attr('data-cubename') );
			//view.cubesviewer.showAboutviews.redrawView (view);
			return false;
		});

		// Redraw views
		$(cubesviewer.gui.views).each(function(idx, view) {
			view.cubesviewer.views.redrawView(view);
		});

	};

	/*
	 * Render initial (constant) elements for the GUI
	 */
	this.onGuiDraw = function(event, gui) {

		$('[data-submenu]', gui.options.container).submenupicker();


		// Configure sortable panel
		/*
		$(gui.options.container).children('.cv-gui-workspace').sortable({
			placeholder : "ui-state-highlight",
			// containment: "parent",
			distance : 15,
			delay : 300,
			handle : ".sorthandle",

			start : function(evt, ui) {
				cubesviewer.gui._sorting = true;
			},
			stop : function(evt, ui) {
				setTimeout(function() {
					cubesviewer.gui._sorting = false;
				}, 200);

			}
		// forcePlaceholderSize: true,
		// forceHlperSize: true,
		});
		*/

	}

}]);


// Disable Debug Info (for production)
angular.module('cv.studio').config([ '$compileProvider', function($compileProvider) {
	// TODO: Enable debug optionally
	// $compileProvider.debugInfoEnabled(false);
} ]);


angular.module('cv.studio').run(['$rootScope', '$compile', '$controller', '$http', '$templateCache', 'cvOptions',
           function($rootScope, $compile, $controller, $http, $templateCache, cvOptions) {

	console.debug("Bootstrapping CubesViewer Studio.");

    // Add default options
	var defaultOptions = {
        container: null,
        user: null,
        showAbout: true
    };
	$.extend(defaultOptions, cvOptions);
	$.extend(cvOptions, defaultOptions);;

    // Get main template from template cache and compile it
	$http.get( "studio/studio.html", { cache: $templateCache } ).then(function(response) {

		var scope = angular.element(cvOptions.container).scope();

		var templateScope = scope.$new();
		$(cvOptions.container).html(response.data);

		//templateCtrl = $controller("CubesViewerStudioController", { $scope: templateScope } );
		//$(cvOptions.container).children().data('$ngControllerController', templateCtrl);

		$compile($(cvOptions.container).contents())(scope);
	});

}]);


/**
 * CubesViewer Studio entry point.
 */
cubesviewer.studio = {

	_configure: function(options) {
		cubesviewer._configure(options);
	},

	init: function(options) {
		this._configure(options);
   		angular.element(document).ready(function() {
   			angular.bootstrap(options.container, ['cv.studio']);
   		});
	}

};
;angular.module('cv').run(['$templateCache', function($templateCache) {
  'use strict';

  $templateCache.put('alerts/alerts.html',
    "<div class=\"cv-bootstrap cv-alerts\">\n" +
    "    <div style=\"min-width: 260px; width: 300px; z-index: 1000;\" >\n" +
    "\n" +
    "        {{# cv.alerts }}\n" +
    "        <div class=\"alert alert-warning alert-dismissable\" style=\"margin-bottom: 5px;\">\n" +
    "            <button type=\"button\" class=\"close\" data-dismiss=\"alert\" aria-hidden=\"true\"><i class=\"fa fa-fw fa-close\"></i></button>\n" +
    "            <i class=\"fa fa-bell\"></i> {{ text }}\n" +
    "        </div>\n" +
    "        {{/ cv.alerts }}\n" +
    "\n" +
    "    </div>\n" +
    "</div>\n"
  );


  $templateCache.put('studio/about.html',
    "<div class=\"modal fade\" id=\"cvAboutModal\" tabindex=\"-1\" role=\"dialog\" aria-labelledby=\"myModalLabel\">\n" +
    "  <div class=\"modal-dialog\" role=\"document\">\n" +
    "    <div class=\"modal-content\">\n" +
    "      <div class=\"modal-header\">\n" +
    "        <button type=\"button\" class=\"close\" data-dismiss=\"modal\" aria-label=\"Close\"><span aria-hidden=\"true\"><i class=\"fa fa-fw fa-close\"></i></span></button>\n" +
    "        <h4 class=\"modal-title\" id=\"myModalLabel\"><i class=\"fa fa-cube\"></i> CubesViewer</h4>\n" +
    "      </div>\n" +
    "      <div class=\"modal-body\">\n" +
    "\n" +
    "            <p><a href=\"http://jjmontesl.github.io/cubesviewer/\">CubesViewer</a> is a visual, web-based tool application for exploring and analyzing\n" +
    "            OLAP databases served by the <a href=\"http://cubes.databrewery.org/\">Cubes OLAP Framework</a>.</p>\n" +
    "            <hr />\n" +
    "\n" +
    "            <p>Version {{ cvVersion }}<br />\n" +
    "            <a href=\"https://github.com/jjmontesl/cubesviewer/\" target=\"_blank\">https://github.com/jjmontesl/cubesviewer/</a></p>\n" +
    "\n" +
    "            <p>by José Juan Montes and others (see AUTHORS)<br />\n" +
    "            2012 - 2016</p>\n" +
    "\n" +
    "            <p>\n" +
    "            <a href=\"\">LICENSE</a>\n" +
    "            </p>\n" +
    "\n" +
    "      </div>\n" +
    "      <div class=\"modal-footer\">\n" +
    "        <button type=\"button\" class=\"btn btn-default\" data-dismiss=\"modal\">Close</button>\n" +
    "      </div>\n" +
    "    </div>\n" +
    "  </div>\n" +
    "</div>\n" +
    "\n" +
    "\n"
  );


  $templateCache.put('studio/panel.html',
    "<div class=\"cv-bootstrap cv-gui-viewcontainer\" ng-controller=\"CubesViewerStudioViewController\">\n" +
    "\n" +
    "    <div class=\"panel panel-primary\">\n" +
    "        <div class=\"panel-heading\" style=\"ver\">\n" +
    "\n" +
    "            <button type=\"button\" ng-click=\"studioViewsService.closeView(view)\" class=\"btn btn-danger btn-xs\" style=\"margin-right: 10px;\"><i class=\"fa fa-fw fa-close\"></i></button>\n" +
    "\n" +
    "            <button type=\"button\" ng-click=\"studioViewsService.toggleCollapseView(view)\" class=\"btn btn-primary btn-xs\" style=\"margin-right: 10px;\"><i class=\"fa fa-fw\" ng-class=\"{'fa-caret-up': !view.collapsed, 'fa-caret-down': view.collapsed }\"></i></button>\n" +
    "\n" +
    "            <span class=\"cv-gui-title\">{{ view.params.name }}</span>\n" +
    "\n" +
    "            <span class=\"badge badge-primary pull-right cv-gui-container-state\" style=\"margin-right: 10px;\">Test</span>\n" +
    "\n" +
    "        </div>\n" +
    "        <div class=\"panel-body\" ng-hide=\"view.collapsed\">\n" +
    "            <div class=\"cv-gui-viewcontent\">\n" +
    "\n" +
    "                <div cv-view-cube view=\"view\"></div>\n" +
    "\n" +
    "            </div>\n" +
    "        </div>\n" +
    "    </div>\n" +
    "\n" +
    "</div>\n"
  );


  $templateCache.put('studio/studio.html',
    "<div class=\"cv-bootstrap\" ng-controller=\"CubesViewerStudioController\">\n" +
    "\n" +
    "    <div class=\"cv-gui-panel\" >\n" +
    "\n" +
    "        <div class=\"dropdown m-b\" style=\"display: inline-block;\">\n" +
    "          <button class=\"btn btn-primary dropdown-toggle\" type=\"button\" data-toggle=\"dropdown\" data-submenu>\n" +
    "            <i class=\"fa fa-fw fa-cube\"></i> Cubes <span class=\"caret\"></span>\n" +
    "          </button>\n" +
    "\n" +
    "          <ul class=\"dropdown-menu cv-gui-cubeslist-menu\">\n" +
    "\n" +
    "            <li ng-repeat=\"cube in cubesService.cubesserver._cube_list | orderBy:'label'\" ng-click=\"studioViewsService.addViewCube(cube.name)\"><a>{{ cube.label }}</a></li>\n" +
    "\n" +
    "          </ul>\n" +
    "        </div>\n" +
    "\n" +
    "\n" +
    "        <div class=\"dropdown m-b\" style=\"display: inline-block;\">\n" +
    "          <button class=\"btn btn-primary dropdown-toggle\" type=\"button\" data-toggle=\"dropdown\" data-submenu>\n" +
    "            <i class=\"fa fa-fw fa-wrench\"></i> Tools <span class=\"caret\"></span>\n" +
    "          </button>\n" +
    "\n" +
    "          <ul class=\"dropdown-menu\">\n" +
    "\n" +
    "                <li><a tabindex=\"0\"><i class=\"fa fa-fw fa-code\"></i> Add view from JSON...</a></li>\n" +
    "\n" +
    "                <div class=\"divider\" ng-if=\"cvOptions.showAbout\"></div>\n" +
    "\n" +
    "                <li class=\"\"><a><i class=\"fa fa-fw fa-question\"></i> User Guide</a></li>\n" +
    "                <li class=\"\" ng-if=\"cvOptions.showAbout\"><a data-toggle=\"modal\" data-target=\"#cvAboutModal\"><i class=\"fa fa-fw fa-info\"></i> About CubesViewer...</a></li>\n" +
    "\n" +
    "            </ul>\n" +
    "        </div>\n" +
    "\n" +
    "        <div ng-include=\"'studio/about.html'\"></div>\n" +
    "\n" +
    "    </div>\n" +
    "\n" +
    "    <div class=\"cv-gui-workspace\">\n" +
    "\n" +
    "        <div ng-repeat=\"studioView in studioViewsService.views\">\n" +
    "            <div cv-studio-view view=\"studioView\"></div>\n" +
    "        </div>\n" +
    "\n" +
    "    </div>\n" +
    "\n" +
    "</div>\n" +
    "\n" +
    "\n"
  );


  $templateCache.put('views/cube/chart/chart-common.html',
    "<div ng-if=\"gridOptions.data.length > 0\" style=\"width: 99%;\">\n" +
    "    <div>\n" +
    "        <div>\n" +
    "            <svg style=\"height: 400px;\" />\n" +
    "        </div>\n" +
    "        <div style=\"font-size: 8px; float: right;\">\n" +
    "            <a href=\"\" class=\"cv-chart-height\" ng-click=\"resizeChart(400);\">Small</a>\n" +
    "            <a href=\"\" class=\"cv-chart-height\" ng-click=\"resizeChart(550);\">Medium</a>\n" +
    "            <a href=\"\" class=\"cv-chart-height\" ng-click=\"resizeChart(700);\">Tall</a>\n" +
    "        </div>\n" +
    "    </div>\n" +
    "</div>\n" +
    "\n" +
    "<div ng-if=\"view.params.yaxis == null\" class=\"alert alert-info\" style=\"margin-bottom: 0px;\">\n" +
    "    Cannot present chart: no <b>measure</b> has been selected.\n" +
    "</div>\n" +
    "\n" +
    "<div ng-if=\"view.params.yaxis != null && gridOptions.data.length == 0\" class=\"alert alert-info\" style=\"margin-bottom: 0px;\">\n" +
    "    Cannot present chart: <b>no rows returned</b> by the current filtering, horizontal dimension, and drilldown combination.\n" +
    "</div>\n" +
    "\n" +
    "<div ng-if=\"view.params.charttype == 'pie' && gridOptions.columnDefs.length > 2\" class=\"alert alert-info\" style=\"margin-bottom: 0px;\">\n" +
    "    Cannot present a <b>pie chart</b> when <b>more than one column</b> is present.\n" +
    "    Tip: review chart data and columns in <a href=\"\" ng-click=\"setViewMode('series')\">series mode</a>.\n" +
    "</div>\n"
  );


  $templateCache.put('views/cube/chart/chart.html',
    "<div ng-controller=\"CubesViewerViewsCubeChartController\">\n" +
    "\n" +
    "    <div ng-if=\"view.params.charttype == 'pie'\">\n" +
    "        <h3><i class=\"fa fa-fw fa-pie-chart\"></i> Chart</h3>\n" +
    "        <div ng-controller=\"CubesViewerViewsCubeChartPieController\">\n" +
    "            <div ng-include=\"'views/cube/chart/chart-common.html'\"></div>\n" +
    "        </div>\n" +
    "    </div>\n" +
    "\n" +
    "    <div ng-if=\"view.params.charttype == 'bars-vertical'\">\n" +
    "        <h3><i class=\"fa fa-fw fa-bar-chart\"></i> Chart</h3>\n" +
    "        <div ng-controller=\"CubesViewerViewsCubeChartBarsVerticalController\">\n" +
    "            <div ng-include=\"'views/cube/chart/chart-common.html'\"></div>\n" +
    "        </div>\n" +
    "    </div>\n" +
    "\n" +
    "    <div ng-if=\"view.params.charttype == 'lines'\">\n" +
    "        <h3><i class=\"fa fa-fw fa-line-chart\"></i> Chart</h3>\n" +
    "        <div ng-controller=\"CubesViewerViewsCubeChartLinesController\">\n" +
    "            <div ng-include=\"'views/cube/chart/chart-common.html'\"></div>\n" +
    "        </div>\n" +
    "    </div>\n" +
    "\n" +
    "    <div ng-if=\"view.params.charttype == 'lines-stacked'\">\n" +
    "        <h3><i class=\"fa fa-fw fa-area-chart\"></i> Chart</h3>\n" +
    "        <div ng-controller=\"CubesViewerViewsCubeChartLinesController\">\n" +
    "            <div ng-include=\"'views/cube/chart/chart-common.html'\"></div>\n" +
    "        </div>\n" +
    "    </div>\n" +
    "\n" +
    "    <div ng-if=\"view.params.charttype == 'radar'\">\n" +
    "        <h3><i class=\"fa fa-fw fa-bullseye\"></i> Chart</h3>\n" +
    "        <div ng-controller=\"CubesViewerViewsCubeChartRadarController\">\n" +
    "            <div ng-include=\"'views/cube/chart/chart-common.html'\"></div>\n" +
    "        </div>\n" +
    "    </div>\n" +
    "\n" +
    "</div>\n"
  );


  $templateCache.put('views/cube/cube-menu-drilldown.html',
    "  <button class=\"btn btn-primary btn-sm dropdown-toggle drilldownbutton\" ng-disabled=\"view.params.mode == 'facts'\" type=\"button\" data-toggle=\"dropdown\" data-submenu>\n" +
    "    <i class=\"fa fa-fw fa-arrow-down\"></i> <span class=\"hidden-xs\">Drilldown</span> <span class=\"caret\"></span>\n" +
    "  </button>\n" +
    "\n" +
    "  <ul class=\"dropdown-menu dropdown-menu-right cv-view-menu-drilldown\">\n" +
    "\n" +
    "      <!-- if ((grayout_drill) && ((($.grep(view.params.drilldown, function(ed) { return ed == dimension.name; })).length > 0))) { -->\n" +
    "      <li on-repeat-done ng-repeat-start=\"dimension in view.cube.dimensions\" ng-if=\"dimension.levels.length == 1\" ng-click=\"selectDrill(dimension.name, true);\">\n" +
    "        <a href=\"\">{{ dimension.label }}</a>\n" +
    "      </li>\n" +
    "      <li ng-repeat-end ng-if=\"dimension.levels.length != 1\" class=\"dropdown-submenu\">\n" +
    "        <a tabindex=\"0\">{{ dimension.label }}</a>\n" +
    "\n" +
    "        <ul ng-if=\"dimension.hierarchies_count() != 1\" class=\"dropdown-menu\">\n" +
    "            <li ng-repeat=\"(hikey,hi) in dimension.hierarchies\" class=\"dropdown-submenu\">\n" +
    "                <a tabindex=\"0\" href=\"\" onclick=\"return false;\">{{ hi.label }}</a>\n" +
    "                <ul class=\"dropdown-menu\">\n" +
    "                    <li ng-repeat=\"level in hi.levels\" ng-click=\"selectDrill(dimension.name + '@' + hi.name + ':' + level.name, true)\"><a href=\"\">{{ level.label }}</a></li>\n" +
    "                </ul>\n" +
    "            </li>\n" +
    "        </ul>\n" +
    "\n" +
    "        <ul ng-if=\"dimension.hierarchies_count() == 1\" class=\"dropdown-menu\">\n" +
    "            <li ng-repeat=\"level in dimension.default_hierarchy().levels\" ng-click=\"selectDrill(dimension.name + ':' + level.name, true)\"><a href=\"\">{{ level.label }}</a></li>\n" +
    "        </ul>\n" +
    "\n" +
    "      </li>\n" +
    "\n" +
    "      <div class=\"divider\"></div>\n" +
    "      <li ng-click=\"selectDrill(null)\"><a href=\"\"><i class=\"fa fa-fw fa-close\"></i> None</a></li>\n" +
    "\n" +
    "  </ul>\n" +
    "\n"
  );


  $templateCache.put('views/cube/cube-menu-filter.html',
    "  <button class=\"btn btn-primary btn-sm dropdown-toggle cutbutton\" type=\"button\" data-toggle=\"dropdown\" data-submenu>\n" +
    "    <i class=\"fa fa-fw fa-filter\"></i> <span class=\"hidden-xs\">Filter</span> <span class=\"caret\"></span>\n" +
    "  </button>\n" +
    "\n" +
    "  <ul class=\"dropdown-menu dropdown-menu-right cv-view-menu cv-view-menu-cut\">\n" +
    "\n" +
    "    <li ng-click=\"filterSelected()\"><a href=\"\"><i class=\"fa fa-fw fa-filter\"></i> Filter selected rows</a></li>\n" +
    "    <div class=\"divider\"></div>\n" +
    "\n" +
    "    <li class=\"dropdown-submenu\">\n" +
    "        <a tabindex=\"0\"><i class=\"fa fa-fw fa-bars\"></i> Dimension filter</a>\n" +
    "        <ul class=\"dropdown-menu\">\n" +
    "\n" +
    "          <li on-repeat-done ng-repeat-start=\"dimension in view.cube.dimensions\" ng-if=\"dimension.levels.length == 1\" ng-click=\"showDimensionFilter(dimension.name);\">\n" +
    "            <a href=\"\">{{ dimension.label }}</a>\n" +
    "          </li>\n" +
    "          <li ng-repeat-end ng-if=\"dimension.levels.length != 1\" class=\"dropdown-submenu\">\n" +
    "            <a tabindex=\"0\">{{ dimension.label }}</a>\n" +
    "\n" +
    "            <ul ng-if=\"dimension.hierarchies_count() != 1\" class=\"dropdown-menu\">\n" +
    "                <li ng-repeat=\"(hikey,hi) in dimension.hierarchies\" class=\"dropdown-submenu\">\n" +
    "                    <a tabindex=\"0\" href=\"\" onclick=\"return false;\">{{ hi.label }}</a>\n" +
    "                    <ul class=\"dropdown-menu\">\n" +
    "                        <!-- ng-click=\"selectDrill(dimension.name + '@' + hi.name + ':' + level.name, true)\"  -->\n" +
    "                        <li ng-repeat=\"level in hi.levels\" ng-click=\"showDimensionFilter(dimension.name + '@' + hi.name + ':' + level.name )\"><a href=\"\">{{ level.label }}</a></li>\n" +
    "                    </ul>\n" +
    "                </li>\n" +
    "            </ul>\n" +
    "\n" +
    "            <ul ng-if=\"dimension.hierarchies_count() == 1\" class=\"dropdown-menu\">\n" +
    "                <!--  selectDrill(dimension.name + ':' + level.name, true) -->\n" +
    "                <li ng-repeat=\"level in dimension.default_hierarchy().levels\" ng-click=\"showDimensionFilter(level);\"><a href=\"\">{{ level.label }}</a></li>\n" +
    "            </ul>\n" +
    "\n" +
    "          </li>\n" +
    "\n" +
    "        </ul>\n" +
    "    </li>\n" +
    "\n" +
    "    <!--\n" +
    "    // Events\n" +
    "    $(view.container).find('.cv-view-show-dimensionfilter').click( function() {\n" +
    "        cubesviewer.views.cube.dimensionfilter.drawDimensionFilter(view, $(this).attr('data-dimension'));\n" +
    "        return false;\n" +
    "    });\n" +
    "     -->\n" +
    "\n" +
    "    <div class=\"divider\"></div>\n" +
    "    <li><a href=\"\"><i class=\"fa fa-fw fa-trash\"></i> Clear filters</a></li>\n" +
    "\n" +
    "  </ul>\n"
  );


  $templateCache.put('views/cube/cube-menu-panel.html',
    "  <button class=\"btn btn-primary btn-sm dropdown-toggle\" type=\"button\" data-toggle=\"dropdown\" data-submenu>\n" +
    "    <i class=\"fa fa-fw fa-file\"></i> <span class=\"hidden-xs\">Panel</span> <span class=\"caret\"></span>\n" +
    "  </button>\n" +
    "\n" +
    "  <ul class=\"dropdown-menu dropdown-menu-right cv-view-menu cv-view-menu-view\">\n" +
    "\n" +
    "    <li><a><i class=\"fa fa-fw fa-save\"></i> Save</a></li>\n" +
    "    <li><a><i class=\"fa fa-fw fa-trash-o\"></i> Delete...</a></li>\n" +
    "    <li><a><i class=\"fa fa-fw fa-pencil\"></i> Rename...</a></li>\n" +
    "    <div class=\"divider\"></div>\n" +
    "    <li><a><i class=\"fa fa-fw fa-share\"></i> Share...</a></li>\n" +
    "    <li><a><i class=\"fa fa-fw fa-clone\"></i> Clone</a></li>\n" +
    "    <div class=\"divider\"></div>\n" +
    "    <li><a><i class=\"fa fa-fw fa-code\"></i> Serialize...</a></li>\n" +
    "    <div class=\"divider\"></div>\n" +
    "    <li><a><i class=\"fa fa-fw fa-close\"></i> Close</a></li>\n" +
    "  </ul>\n"
  );


  $templateCache.put('views/cube/cube-menu-view.html',
    "  <button class=\"btn btn-primary btn-sm dropdown-toggle\" type=\"button\" data-toggle=\"dropdown\" data-submenu>\n" +
    "    <i class=\"fa fa-fw fa-cogs\"></i> <span class=\"hidden-xs\">View</span> <span class=\"caret\"></span>\n" +
    "  </button>\n" +
    "\n" +
    "  <ul class=\"dropdown-menu dropdown-menu-right cv-view-menu cv-view-menu-view\">\n" +
    "\n" +
    "    <li ng-show=\"view.params.mode == 'chart'\" class=\"dropdown-submenu\">\n" +
    "        <a tabindex=\"0\" ><i class=\"fa fa-fw fa-area-chart\"></i> Chart type</a>\n" +
    "        <ul class=\"dropdown-menu\">\n" +
    "          <li ng-click=\"selectChartType('pie')\"><a href=\"\"><i class=\"fa fa-fw fa-pie-chart\"></i> Pie</a></li>\n" +
    "          <li ng-click=\"selectChartType('bars-vertical')\"><a href=\"\"><i class=\"fa fa-fw fa-bar-chart\"></i> Bars Vertical</a></li>\n" +
    "          <li ng-click=\"selectChartType('lines')\"><a href=\"\"><i class=\"fa fa-fw fa-line-chart\"></i> Lines</a></li>\n" +
    "          <li ng-click=\"selectChartType('lines-stacked')\"><a href=\"\"><i class=\"fa fa-fw fa-area-chart\"></i> Areas</a></li>\n" +
    "          <li ng-click=\"selectChartType('radar')\"><a href=\"\"><i class=\"fa fa-fw fa-bullseye\"></i> Radar</a></li>\n" +
    "\n" +
    "          <div class=\"divider\"></div>\n" +
    "\n" +
    "          <li><a href=\"\"><i class=\"fa fa-fw fa-sun-o\"></i> Sunburst</a></li>\n" +
    "          <li><a href=\"\"><i class=\"fa fa-fw fa-dot-circle-o\"></i> Bubbles</a></li>\n" +
    "\n" +
    "          <div class=\"divider\"></div>\n" +
    "\n" +
    "          <li><a href=\"\"><i class=\"fa fa-fw fa-globe\"></i> Map</a></li>\n" +
    "        </ul>\n" +
    "    </li>\n" +
    "\n" +
    "    <li ng-show=\"view.params.mode == 'chart'\" ng-click=\"view.params.chartoptions.showLegend = !view.params.chartoptions.showLegend; view._cubeDataUpdated = true;\">\n" +
    "        <a><i class=\"fa fa-fw\" ng-class=\"{'fa-toggle-on': view.params.chartoptions.showLegend, 'fa-toggle-off': ! view.params.chartoptions.showLegend }\"></i> Toggle legend</a>\n" +
    "    </li>\n" +
    "\n" +
    "    <div ng-show=\"view.params.mode == 'chart'\" class=\"divider\"></div>\n" +
    "\n" +
    "    <li ng-show=\"view.params.mode == 'series' || view.params.mode == 'chart'\" class=\"dropdown-submenu\">\n" +
    "        <a tabindex=\"0\"><i class=\"fa fa-fw fa-long-arrow-right\"></i> Horizontal dimension</a>\n" +
    "        <ul class=\"dropdown-menu\">\n" +
    "\n" +
    "          <li on-repeat-done ng-repeat-start=\"dimension in view.cube.dimensions\" ng-if=\"dimension.levels.length == 1\" ng-click=\"selectXAxis(dimension.name)\">\n" +
    "            <a href=\"\">{{ dimension.label }}</a>\n" +
    "          </li>\n" +
    "          <li ng-repeat-end ng-if=\"dimension.levels.length != 1\" class=\"dropdown-submenu\">\n" +
    "            <a tabindex=\"0\">{{ dimension.label }}</a>\n" +
    "\n" +
    "            <ul ng-if=\"dimension.hierarchies_count() != 1\" class=\"dropdown-menu\">\n" +
    "                <li ng-repeat=\"(hikey,hi) in dimension.hierarchies\" class=\"dropdown-submenu\">\n" +
    "                    <a tabindex=\"0\" href=\"\" onclick=\"return false;\">{{ hi.label }}</a>\n" +
    "                    <ul class=\"dropdown-menu\">\n" +
    "                        <!-- ng-click=\"selectDrill(dimension.name + '@' + hi.name + ':' + level.name, true)\"  -->\n" +
    "                        <li ng-repeat=\"level in hi.levels\" ng-click=\"selectXAxis(dimension.name + '@' + hi.name + ':' + level.name )\"><a href=\"\">{{ level.label }}</a></li>\n" +
    "                    </ul>\n" +
    "                </li>\n" +
    "            </ul>\n" +
    "\n" +
    "            <ul ng-if=\"dimension.hierarchies_count() == 1\" class=\"dropdown-menu\">\n" +
    "                <!--  selectDrill(dimension.name + ':' + level.name, true) -->\n" +
    "                <li ng-repeat=\"level in dimension.default_hierarchy().levels\" ng-click=\"selectXAxis(dimension.name + ':' + level.name);\"><a href=\"\">{{ level.label }}</a></li>\n" +
    "            </ul>\n" +
    "\n" +
    "          </li>\n" +
    "\n" +
    "          <div class=\"divider\"></div>\n" +
    "\n" +
    "          <li ng-click=\"selectXAxis(null);\"><a href=\"\"><i class=\"fa fa-fw fa-close\"></i> None</a></li>\n" +
    "\n" +
    "        </ul>\n" +
    "    </li>\n" +
    "\n" +
    "    <li ng-show=\"view.params.mode == 'series' || view.params.mode == 'chart'\" class=\"dropdown-submenu\">\n" +
    "        <a tabindex=\"0\"><i class=\"fa fa-fw fa-crosshairs\"></i> Measure</a>\n" +
    "        <ul class=\"dropdown-menu\">\n" +
    "\n" +
    "          <li ng-repeat=\"measure in view.cube.measures\" ng-if=\"view.cube.measureAggregates(measure.name).length > 0\" class=\"dropdown-submenu\">\n" +
    "            <a href=\"\">{{ measure.label }}</a>\n" +
    "            <ul class=\"dropdown-menu\">\n" +
    "                <li ng-repeat=\"aggregate in view.cube.measureAggregates(measure.name)\" >\n" +
    "                    <a href=\"\" ng-click=\"selectMeasure(aggregate.ref)\">{{ aggregate.label }}</a>\n" +
    "                </li>\n" +
    "            </ul>\n" +
    "          </li>\n" +
    "\n" +
    "          <div class=\"divider\" ng-if=\"view.cube.measureAggregates(null).length > 0\"></div>\n" +
    "          <li ng-repeat=\"aggregate in view.cube.measureAggregates(null)\" ng-if=\"view.cube.measureAggregates(null).length > 0\" >\n" +
    "            <a href=\"\" ng-click=\"selectMeasure(aggregate.ref)\">{{ aggregate.label }}</a>\n" +
    "          </li>\n" +
    "\n" +
    "        </ul>\n" +
    "    </li>\n" +
    "\n" +
    "    <div ng-show=\"view.params.mode == 'series' || view.params.mode == 'chart'\" class=\"divider\"></div>\n" +
    "\n" +
    "    <li ng-show=\"view.params.mode != 'chart'\" ><a><i class=\"fa fa-fw fa-table\"></i> Export table</a></li>\n" +
    "    <li><a><i class=\"fa fa-fw fa-th\"></i> Export facts</a></li>\n" +
    "\n" +
    "  </ul>\n"
  );


  $templateCache.put('views/cube/cube.html',
    "<div class=\"cv-view-panel\" ng-controller=\"CubesViewerViewsCubeController\">\n" +
    "\n" +
    "    <div class=\"cv-view-viewmenu\">\n" +
    "\n" +
    "        <div class=\"panel panel-primary pull-right\" style=\"padding: 3px;\">\n" +
    "\n" +
    "            <div class=\"btn-group\" role=\"group\" aria-label=\"...\">\n" +
    "              <button type=\"button\" ng-click=\"setViewMode('explore')\" ng-class=\"{'active': view.params.mode == 'explore'}\" class=\"btn btn-primary btn-sm explorebutton\" title=\"Explore\"><i class=\"fa fa-fw fa-arrow-circle-down\"></i></button>\n" +
    "              <button type=\"button\" ng-click=\"setViewMode('facts')\" ng-class=\"{'active': view.params.mode == 'facts'}\" class=\"btn btn-primary btn-sm \" title=\"Facts\"><i class=\"fa fa-fw fa-th\"></i></button>\n" +
    "              <button type=\"button\" ng-click=\"setViewMode('series')\" ng-class=\"{'active': view.params.mode == 'series'}\" class=\"btn btn-primary btn-sm \" title=\"Series\"><i class=\"fa fa-fw fa-clock-o\"></i></button>\n" +
    "              <button type=\"button\" ng-click=\"setViewMode('chart')\" ng-class=\"{'active': view.params.mode == 'chart'}\" class=\"btn btn-primary btn-sm \" title=\"Charts\"><i class=\"fa fa-fw fa-area-chart\"></i></button>\n" +
    "            </div>\n" +
    "\n" +
    "            <div ng-include=\"'views/cube/cube-menu-drilldown.html'\" class=\"dropdown m-b\" style=\"display: inline-block; margin-left: 5px;\"></div>\n" +
    "\n" +
    "            <div ng-include=\"'views/cube/cube-menu-filter.html'\" class=\"dropdown m-b\" style=\"display: inline-block; margin-left: 2px;\"></div>\n" +
    "\n" +
    "            <div ng-include=\"'views/cube/cube-menu-view.html'\" class=\"dropdown m-b\" style=\"display: inline-block; margin-left: 5px;\"></div>\n" +
    "\n" +
    "            <div ng-include=\"'views/cube/cube-menu-panel.html'\" class=\"dropdown m-b\" style=\"display: inline-block; margin-left: 5px;\"></div>\n" +
    "\n" +
    "        </div>\n" +
    "\n" +
    "    </div>\n" +
    "\n" +
    "    <div class=\"cv-view-viewinfo\">\n" +
    "        <div>\n" +
    "            <div class=\"cv-view-viewinfo-drill\">\n" +
    "\n" +
    "                <div class=\"label label-secondary cv-infopiece cv-view-viewinfo-cubename\" style=\"color: white; background-color: black;\">\n" +
    "                    <span><i class=\"fa fa-fw fa-cube\"></i> <b>Cube:</b> {{ view.cube.label }}</span>\n" +
    "                    <button type=\"button\" class=\"btn btn-info btn-xs\" style=\"visibility: hidden;\"><i class=\"fa fa-fw fa-info\"></i></button>\n" +
    "                </div>\n" +
    "\n" +
    "                <div ng-repeat=\"drilldown in view.params.drilldown\" class=\"label label-secondary cv-infopiece cv-view-viewinfo-drill\" style=\"color: black; background-color: #ccffcc;\">\n" +
    "                    <span><i class=\"fa fa-fw fa-arrow-down\"></i> <b>Drilldown:</b> {{ view.cube.cvdim_parts(drilldown).label }}</span>\n" +
    "                    <button type=\"button\" ng-click=\"showDimensionFilter(drilldown)\" class=\"btn btn-secondary btn-xs\" style=\"margin-left: 3px;\"><i class=\"fa fa-fw fa-search\"></i></button>\n" +
    "                    <button type=\"button\" ng-click=\"selectDrill(drilldown, '')\" class=\"btn btn-danger btn-xs\" style=\"margin-left: 1px;\"><i class=\"fa fa-fw fa-trash\"></i></button>\n" +
    "                </div>\n" +
    "\n" +
    "            </div>\n" +
    "            <div class=\"cv-view-viewinfo-cut\">\n" +
    "                <!--\n" +
    "                    var dimensionString = $(this).parents('.cv-view-infopiece-cut').first().attr('data-dimension');\n" +
    "                    var parts = view.cube.cvdim_parts(dimensionString);\n" +
    "                    var depth = $(this).parents('.cv-view-infopiece-cut').first().attr('data-value').split(';')[0].split(\",\").length;\n" +
    "                    cubesviewer.views.cube.dimensionfilter.drawDimensionFilter(view, dimensionString + \":\" + parts.hierarchy.levels[depth - 1] );\n" +
    "                 -->\n" +
    "                <div ng-repeat=\"cut in view.params.cuts\" ng-init=\"dimparts = view.cube.cvdim_parts(cut.dimension.replace(':',  '@')); equality = cut.invert ? ' &ne; ' : ' = ';\" class=\"label label-secondary cv-infopiece cv-view-viewinfo-cut\" style=\"color: black; background-color: #ffcccc;\">\n" +
    "                    <span style=\"max-width: 480px;\"><i class=\"fa fa-fw fa-filter\"></i> <b>Filter:</b> {{ dimparts.label }} {{ equality }} <span title=\"{{ cut.value }}\">{{ cut.value }}</span></span>\n" +
    "                    <button type=\"button\" ng-click=\"showDimensionFilter(cut.dimension)\" class=\"btn btn-secondary btn-xs\" style=\"margin-left: 3px;\"><i class=\"fa fa-fw fa-search\"></i></button>\n" +
    "                    <button type=\"button\" ng-click=\"selectCut(cut.dimension, '', cut.invert)\" class=\"btn btn-danger btn-xs\" style=\"margin-left: 1px;\"><i class=\"fa fa-fw fa-trash\"></i></button>\n" +
    "                </div>\n" +
    "            </div>\n" +
    "            <div class=\"cv-view-viewinfo-extra\">\n" +
    "\n" +
    "                <div ng-if=\"view.params.mode == 'series' || view.params.mode == 'chart'\" class=\"label label-secondary cv-infopiece cv-view-viewinfo-extra\" style=\"color: black; background-color: #ccccff;\">\n" +
    "                    <span style=\"max-width: 350px;\"><i class=\"fa fa-fw fa-bullseye\"></i> <b>Measure:</b> {{ (view.params.yaxis != null) ? view.params.yaxis : \"None\" }}</span>\n" +
    "                    <button type=\"button\" class=\"btn btn-info btn-xs\" style=\"visibility: hidden;\"><i class=\"fa fa-fw fa-info\"></i></button>\n" +
    "                </div>\n" +
    "\n" +
    "                <div ng-if=\"view.params.mode == 'series' || view.params.mode == 'chart'\" class=\"label label-secondary cv-infopiece cv-view-viewinfo-extra\" style=\"color: black; background-color: #ccddff;\">\n" +
    "                    <span style=\"max-width: 350px;\"><i class=\"fa fa-fw fa-long-arrow-right\"></i> <b>Horizontal dimension:</b> {{ (view.params.xaxis != null) ? view.cube.cvdim_parts(view.params.xaxis).label : \"None\" }}</span>\n" +
    "                    <!-- <button type=\"button\" ng-click=\"showDimensionFilter(view.params.xaxis)\" class=\"btn btn-secondary btn-xs\" style=\"margin-left: 3px;\"><i class=\"fa fa-fw fa-search\"></i></button>  -->\n" +
    "                    <!-- <button type=\"button\" ng-click=\"selectXAxis(null)\" class=\"btn btn-danger btn-xs\" style=\"margin-left: 1px;\"><i class=\"fa fa-fw fa-trash\"></i></button>  -->\n" +
    "                    <button type=\"button\" class=\"btn btn-info btn-xs\" style=\"visibility: hidden;\"><i class=\"fa fa-fw fa-info\"></i></button>\n" +
    "                </div>\n" +
    "\n" +
    "            </div>\n" +
    "        </div>\n" +
    "    </div>\n" +
    "    <div class=\"clearfix\"></div>\n" +
    "\n" +
    "    <div class=\"cv-view-viewdialogs\">\n" +
    "        <div ng-if=\"view.dimensionFilter\" ng-include=\"'views/cube/filter/dimension.html'\"></div>\n" +
    "    </div>\n" +
    "\n" +
    "    <div class=\"cv-view-viewdata\">\n" +
    "\n" +
    "        <div ng-if=\"view.params.mode == 'explore'\" ng-include=\"'views/cube/explore/explore.html'\"></div>\n" +
    "        <div ng-if=\"view.params.mode == 'facts'\" ng-include=\"'views/cube/facts/facts.html'\"></div>\n" +
    "        <div ng-if=\"view.params.mode == 'series'\" ng-include=\"'views/cube/series/series.html'\"></div>\n" +
    "        <div ng-if=\"view.params.mode == 'chart'\" ng-include=\"'views/cube/chart/chart.html'\"></div>\n" +
    "\n" +
    "    </div>\n" +
    "    <div class=\"clearfix\"></div>\n" +
    "\n" +
    "    <div class=\"cv-view-viewfooter\"></div>\n" +
    "\n" +
    "</div>\n"
  );


  $templateCache.put('views/cube/explore/explore.html',
    "<div ng-controller=\"CubesViewerViewsCubeExploreController\">\n" +
    "\n" +
    "    <!-- ($(view.container).find('.cv-view-viewdata').children().size() == 0)  -->\n" +
    "    <h3><i class=\"fa fa-fw fa-arrow-circle-down\"></i> Aggregated Data</h3>\n" +
    "\n" +
    "    <div ui-grid=\"gridOptions\"\n" +
    "         ui-grid-resize-columns ui-grid-move-columns ui-grid-selection ui-grid-auto-resize\n" +
    "         ui-grid-pagination ui-grid-pinning\n" +
    "         style=\"width: 100%;\" ng-style=\"{height: ((gridOptions.data.length < 15 ? gridOptions.data.length : 15) * 24) + 44 + 30 + 'px'}\">\n" +
    "    </div>\n" +
    "    <div style=\"height: 30px;\">&nbsp;</div>\n" +
    "\n" +
    "</div>\n"
  );


  $templateCache.put('views/cube/facts/facts.html',
    "<div ng-controller=\"CubesViewerViewsCubeFactsController\">\n" +
    "\n" +
    "    <!-- ($(view.container).find('.cv-view-viewdata').children().size() == 0)  -->\n" +
    "    <h3><i class=\"fa fa-fw fa-th\"></i> Facts data</h3>\n" +
    "\n" +
    "    <div ng-if=\"gridOptions.data.length > 0\"\n" +
    "         ui-grid=\"gridOptions\"\n" +
    "         ui-grid-resize-columns ui-grid-move-columns ui-grid-selection ui-grid-auto-resize\n" +
    "         ui-grid-pagination ui-grid-pinning\n" +
    "         style=\"width: 100%;\" ng-style=\"{height: ((gridOptions.data.length < 15 ? gridOptions.data.length : 15) * 24) + 44 + 30 + 'px'}\">\n" +
    "    </div>\n" +
    "    <div ng-if=\"gridOptions.data.length > 0\" style=\"height: 30px;\">&nbsp;</div>\n" +
    "\n" +
    "    <div ng-if=\"gridOptions.data.length == 0\">No facts are returned by the current filtering combination.</div>\n" +
    "\n" +
    "</div>\n"
  );


  $templateCache.put('views/cube/filter/dimension.html',
    "<div ng-controller=\"CubesViewerViewsCubeFilterDimensionController\">\n" +
    "\n" +
    "    <div class=\"panel panel-default panel-outline\" style=\"border-color: #ffcccc;\">\n" +
    "        <div class=\"panel-heading clearfix\" style=\"border-color: #ffcccc;\">\n" +
    "            <button class=\"btn btn-xs btn-danger pull-right\" ng-click=\"closeDimensionFilter()\"><i class=\"fa fa-fw fa-close\"></i></button>\n" +
    "            <h4 style=\"margin: 2px 0px 0px 0px;\"><i class=\"fa fa-fw fa-filter\"></i> Dimension filter: <b>{{ parts.label }}</b></h4>\n" +
    "        </div>\n" +
    "        <div class=\"panel-body\">\n" +
    "\n" +
    "          <div class=\"row\">\n" +
    "            <div class=\"col-xs-12\">\n" +
    "            <form class=\"form-inline\" >\n" +
    "\n" +
    "              <div class=\"form-group has-feedback\">\n" +
    "                <!-- <label for=\"search\">Search:</label>  -->\n" +
    "                <input type=\"text\" class=\"form-control\" placeholder=\"Search...\" style=\"width: 16em;\">\n" +
    "                <i class=\"fa fa-fw fa-times-circle form-control-feedback\"></i>\n" +
    "              </div>\n" +
    "\n" +
    "              <div class=\"form-group\">\n" +
    "\n" +
    "                <div class=\"input-group\" style=\"margin-left: 10px;\">\n" +
    "                  <span class=\"input-group-btn\">\n" +
    "                    <button class=\"btn btn-default\" type=\"button\" title=\"Select all\"><i class=\"fa fa-fw fa-check-square-o\"></i></button>\n" +
    "                  </span>\n" +
    "                  <span class=\"input-group-btn\">\n" +
    "                    <button class=\"btn btn-default\" type=\"button\" title=\"Select none\"><i class=\"fa fa-fw fa-square-o\"></i></button>\n" +
    "                  </span>\n" +
    "                </div>\n" +
    "                <!-- <label for=\"search\">Search:</label>  -->\n" +
    "              </div>\n" +
    "\n" +
    "              <button class=\"btn btn-default\" type=\"button\" title=\"Drilldown this\" ng-click=\"selectDrill(view.dimensionFilter, true)\"><i class=\"fa fa-fw fa-arrow-down\"></i></button>\n" +
    "\n" +
    "              <div class=\"form-group\">\n" +
    "\n" +
    "                <div class=\"input-group\" style=\"margin-left: 10px;\">\n" +
    "                  <span class=\"input-group-btn\">\n" +
    "                    <button class=\"btn btn-default active\" type=\"button\"><b>=</b> Select</button>\n" +
    "                  </span>\n" +
    "                  <span class=\"input-group-btn\">\n" +
    "                    <button class=\"btn btn-default\" type=\"button\"><b>&ne;</b> Invert</button>\n" +
    "                  </span>\n" +
    "                </div>\n" +
    "                <!-- <label for=\"search\">Search:</label>  -->\n" +
    "              </div>\n" +
    "\n" +
    "              <button class=\"btn btn-success\" type=\"button\"><i class=\"fa fa-fw fa-filter\"></i> Apply</button>\n" +
    "            </form>\n" +
    "            </div>\n" +
    "        </div>\n" +
    "\n" +
    "            <div class=\"row\" style=\"margin-top: 5px;\">\n" +
    "\n" +
    "                <div class=\"col-xs-6\">\n" +
    "                    <span ng-show=\"loadingDimensionValues\" ><i class=\"fa fa-circle-o-notch fa-spin fa-fw margin-bottom\"></i> Loading...</span>\n" +
    "                    <div class=\"panel panel-default panel-outline\" style=\"margin-bottom: 0px;\"><div class=\"panel-body\" style=\"max-height: 180px; overflow-y: auto; overflow-x: hidden;\">\n" +
    "                        <div ng-repeat=\"val in dimensionValues\" style=\"overflow-x: hidden; text-overflow: ellipsis; white-space: nowrap;\">\n" +
    "                            <input type=\"checkbox\" value=\"{{ val.value }}\" style=\"vertical-align: bottom;\" />\n" +
    "                            <span>{{ val.label }}</span>\n" +
    "                        </div>\n" +
    "                    </div></div>\n" +
    "\n" +
    "                </div>\n" +
    "\n" +
    "            </div>\n" +
    "\n" +
    "        </div>\n" +
    "    </div>\n" +
    "\n" +
    "</div>\n"
  );


  $templateCache.put('views/cube/series/series.html',
    "<div ng-controller=\"CubesViewerViewsCubeSeriesController\">\n" +
    "\n" +
    "    <!-- ($(view.container).find('.cv-view-viewdata').children().size() == 0)  -->\n" +
    "    <h3><i class=\"fa fa-fw fa-clock-o\"></i> Series table</h3>\n" +
    "\n" +
    "    <div ng-if=\"gridOptions.data.length > 0\"\n" +
    "         ui-grid=\"gridOptions\"\n" +
    "         ui-grid-resize-columns ui-grid-move-columns ui-grid-selection ui-grid-auto-resize\n" +
    "         ui-grid-pagination ui-grid-pinning\n" +
    "         style=\"width: 100%;\" ng-style=\"{height: ((gridOptions.data.length < 15 ? gridOptions.data.length : 15) * 24) + 44 + 30 + 'px'}\">\n" +
    "    </div>\n" +
    "    <div ng-if=\"gridOptions.data.length > 0\" style=\"height: 30px;\">&nbsp;</div>\n" +
    "\n" +
    "    <div ng-if=\"view.params.yaxis == null\" class=\"alert alert-info\" style=\"margin-bottom: 0px;\">\n" +
    "        Cannot present series table: no <b>measure</b> has been selected.\n" +
    "    </div>\n" +
    "\n" +
    "    <div ng-if=\"view.params.yaxis != null && gridOptions.data.length == 0\" class=\"alert alert-info\" style=\"margin-bottom: 0px;\">\n" +
    "        Cannot present series table: no rows are returned by the current filtering, horizontal dimension, and drilldown combination.\n" +
    "    </div>\n" +
    "\n" +
    "</div>\n"
  );

}]);