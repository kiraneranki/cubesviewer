/*
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
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

"use strict";

/**
 * CubesViewer view module.
 */
angular.module('cv.views.cube', []);


/**
 * cvViewCube directive and controller.
 *
 * FIXME: Some of this code shall be on a parent generic "view" directive.
 */
angular.module('cv.views.cube').controller("CubesViewerViewsCubeController", ['$rootScope', '$scope', '$timeout', 'cvOptions', 'cubesService', 'viewsService',
                                                     function ($rootScope, $scope, $timeout, cvOptions, cubesService, viewsService) {

	$scope.$rootScope = $rootScope;
	$scope.viewsService = viewsService;
	$scope.cvOptions = cvOptions;
	$scope.cubesService = cubesService;

	$scope.dimensionFilter = null;

	$scope.$watch ("view", function(view) {
		if (view) {
			view._resultLimitHit = false;
			view._requestFailed = false;
		}
	});

	$scope.refreshView = function() {
		if ($scope.view && $scope.view.cube) $scope.$broadcast("ViewRefresh", $scope.view);
	};

	/**
	 * Define view mode ('explore', 'series', 'facts', 'chart').
	 */
	$scope.setViewMode = function(mode) {
		$scope.view.setViewMode(mode);
		//$scope.refreshView();
	};


	$scope.initCube = function() {

		$scope.view.cube = null;

		// Apply default cube view parameters
		var cubeViewDefaultParams = {
			"mode" : "explore",
			"drilldown" : [],
			"cuts" : [],

			"datefilters": []
		};

		var jqxhr = cubesService.cubesserver.get_cube($scope.view.params.cubename, function(cube) {

			$scope.view.cube = cube;
			console.debug($scope.view.cube);

			// Apply parameters if cube metadata contains specific cv-view-params
			// TODO: Don't do this if this was a saved or pre-initialized view, only for new views
			if ('cv-view-params' in $scope.view.cube.info) {
				$scope.view.params = $.extend({}, cubeViewDefaultParams, $scope.view.cube.info['cv-view-params'], $scope.view.params);
			} else {
				$scope.view.params = $.extend({}, cubeViewDefaultParams, $scope.view.params);
			}

			$timeout(function() {
				//$scope.refreshView();
			}, 0);

		});
		jqxhr.fail(function() {
			$scope.view.state = cubesviewer.VIEW_STATE_ERROR;
			console.debug(cubesviewer.VIEW_STATE_ERROR);
			$rootScope.$apply();
		});
	};

	$scope.requestErrorHandler = function() {
		$scope.view._requestFailed = true;
	};

	$scope.validateData = function(data, status) {
		//console.debug(data);
		$scope.view._requestFailed = false;
		$scope.view._resultLimitHit = false;
		if ( ("cells" in data && data.cells.length >= cubesService.cubesserver.info.json_record_limit) ||
		     (data.length && data.length >= cubesService.cubesserver.info.json_record_limit) ) {
			$scope.view._resultLimitHit = true;
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

		$scope.refreshView();
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

		$scope.refreshView();
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

	// Select a cut
	$scope.selectCut = function(dimension, value, invert) {

		var view = $scope.view;

		if (dimension != "") {
			if (value != "") {
				/*
				var existing_cut = $.grep(view.params.cuts, function(e) {
					return e.dimension == dimension;
				});
				if (existing_cut.length > 0) {
					//dialogService.show("Cannot cut dataset. Dimension '" + dimension + "' is already filtered.");
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

		$scope.refreshView();

	};

	$scope.showDimensionFilter = function(dimension) {
		$scope.view.dimensionFilter = dimension;
	};

	/*
	 * Selects measure axis
	 */
	$scope.selectMeasure = function(measure) {
		$scope.view.params.yaxis = measure;
		$scope.refreshView();
	}

	/*
	 * Selects horizontal axis
	 */
	$scope.selectXAxis = function(dimension) {
		$scope.view.params.xaxis = (dimension == "" ? null : dimension);
		$scope.refreshView();
	}

	/*
	 * Selects chart type
	 */
	$scope.selectChartType = function(charttype) {
		$scope.view.params.charttype = charttype;
		$scope.refreshView();
	};

	/*
	 * Selects chart type
	 */
	$scope.selectCalculation = function(calculation) {
		$scope.view.params.calculation = calculation;
		$scope.refreshView();
	};


	/*
	 * Serialize view dialog
	 */
	$scope.showSerializeView = function(view) {
		studioViewsService.studioScope.showSerializeView(view);
	};

	/**
	 * Adds a date filter.
	 */
	$scope.selectDateFilter = function(dimension, enabled) {

		var view = $scope.view;
		var cube = view.cube;

		// TODO: Show a notice if the dimension already has a date filter (? and cut filter)

		if (dimension != "") {
			if (enabled == "1") {
				view.params.datefilters.push({
					"dimension" : dimension,
					"mode" : "auto-last3m",
					"date_from" : null,
					"date_to" : null
				});
			} else {
				for ( var i = 0; i < view.params.datefilters.length; i++) {
					if (view.params.datefilters[i].dimension.split(':')[0] == dimension) {
						view.params.datefilters.splice(i, 1);
						break;
					}
				}
			}
		} else {
			view.params.datefilters = [];
		}

		$scope.refreshView();

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


	var avalue = Math.abs(value);

	var intString = Math.floor(avalue).toString();
	for (var i = 0; i < intString.length; i++) {
		result = result + intString[i];
		var invPos = (intString.length - i - 1);
		if (invPos > 0 && invPos % 3 == 0) result = result + thousandsSeparator;
	}
	if (decimalPlaces > 0) {
		result = result + parseFloat(avalue - Math.floor(avalue)).toFixed(decimalPlaces).toString().replace(".", decimalSeparator).substring(1);
	}

	if (value < 0) result = "-" + result;

	return result;
};
