(() => {
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
    get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
  }) : x)(function(x) {
    if (typeof require !== "undefined") return require.apply(this, arguments);
    throw Error('Dynamic require of "' + x + '" is not supported');
  });
  var __commonJS = (cb, mod) => function __require2() {
    try {
      return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
    } catch (e) {
      throw mod = 0, e;
    }
  };

  // apps/three-game/src/config/constants.js
  var require_constants = __commonJS({
    "apps/three-game/src/config/constants.js"(exports, module) {
      var APP_NAME = "斯诺石狮三剑克";
      var BALL_KIND = {
        CUE: "cue",
        RED: "red",
        YELLOW: "yellow",
        GREEN: "green",
        BROWN: "brown",
        BLUE: "blue",
        PINK: "pink",
        BLACK: "black"
      };
      var COLOR_ORDER = [
        BALL_KIND.YELLOW,
        BALL_KIND.GREEN,
        BALL_KIND.BROWN,
        BALL_KIND.BLUE,
        BALL_KIND.PINK,
        BALL_KIND.BLACK
      ];
      module.exports = {
        APP_NAME,
        BALL_KIND,
        COLOR_ORDER
      };
    }
  });

  // apps/three-game/src/core/model/ballSpec.js
  var require_ballSpec = __commonJS({
    "apps/three-game/src/core/model/ballSpec.js"(exports, module) {
      var { BALL_KIND } = require_constants();
      var BALL_RADIUS_MM = 26.25;
      var BALL_MASS = 1;
      var BALL_INERTIA = 2 / 5 * BALL_MASS * BALL_RADIUS_MM * BALL_RADIUS_MM;
      var BALL_VALUES = {
        [BALL_KIND.RED]: 1,
        [BALL_KIND.YELLOW]: 2,
        [BALL_KIND.GREEN]: 3,
        [BALL_KIND.BROWN]: 4,
        [BALL_KIND.BLUE]: 5,
        [BALL_KIND.PINK]: 6,
        [BALL_KIND.BLACK]: 7,
        [BALL_KIND.CUE]: 0
      };
      var BALL_COLORS = {
        [BALL_KIND.CUE]: "#fff2bd",
        [BALL_KIND.RED]: "#e50012",
        [BALL_KIND.YELLOW]: "#f7a800",
        [BALL_KIND.GREEN]: "#08b976",
        [BALL_KIND.BROWN]: "#a86122",
        [BALL_KIND.BLUE]: "#0078bd",
        [BALL_KIND.PINK]: "#ff5a7d",
        [BALL_KIND.BLACK]: "#050505"
      };
      var BALL_SPEC = {
        radius: BALL_RADIUS_MM,
        mass: BALL_MASS,
        inertia: BALL_INERTIA
      };
      function getBallSpec() {
        return { ...BALL_SPEC };
      }
      module.exports = {
        BALL_RADIUS_MM,
        BALL_MASS,
        BALL_INERTIA,
        BALL_VALUES,
        BALL_COLORS,
        BALL_SPEC,
        getBallSpec
      };
    }
  });

  // apps/three-game/src/core/model/standardTableSpec.js
  var require_standardTableSpec = __commonJS({
    "apps/three-game/src/core/model/standardTableSpec.js"(exports, module) {
      var INCH_MM = 25.4;
      var STANDARD_TABLE = Object.freeze({
        lengthMm: 140.5 * INCH_MM,
        widthMm: 70 * INCH_MM,
        cushionTopHeightMm: 34 * INCH_MM,
        baulkFromBottomMm: 29 * INCH_MM,
        dRadiusMm: 11.5 * INCH_MM,
        blackFromTopMm: 12.75 * INCH_MM,
        source: "https://wpbsa.com/wp-content/uploads/2198_WPBSA-Rulebook-2024-25.pdf"
      });
      module.exports = { INCH_MM, STANDARD_TABLE };
    }
  });

  // apps/three-game/src/core/model/calibratePhysicalBoundary.js
  var require_calibratePhysicalBoundary = __commonJS({
    "apps/three-game/src/core/model/calibratePhysicalBoundary.js"(exports, module) {
      var { STANDARD_TABLE } = require_standardTableSpec();
      function calibratePhysicalBoundary(source) {
        const straight = source.lines.filter((line) => line.boundaryType === "straightRail");
        const points = straight.flatMap((line) => line.polylineTableMm);
        const oldHalfX = Math.max(...points.map((p) => Math.abs(p[0])));
        const oldHalfY = Math.max(...points.map((p) => Math.abs(p[1])));
        const dx = STANDARD_TABLE.lengthMm / 2 - oldHalfX;
        const dy = STANDARD_TABLE.widthMm / 2 - oldHalfY;
        const translate = (point, areaId) => {
          const middle = areaId.startsWith("middle-");
          const rail = areaId.startsWith("rail-");
          return [
            point[0] + (middle || rail && Math.abs(point[0]) < oldHalfX / 2 ? 0 : Math.sign(point[0]) * dx),
            point[1] + Math.sign(point[1]) * dy
          ];
        };
        return {
          ...source,
          calibration: { standard: STANDARD_TABLE.source, playAreaMm: {
            width: STANDARD_TABLE.lengthMm,
            height: STANDARD_TABLE.widthMm
          }, translationMm: { x: dx, y: dy }, pocketShapePreserved: true },
          lines: source.lines.map((line) => ({
            ...line,
            controlTableMm: line.controlTableMm?.map((p) => translate(p, line.areaId)),
            polylineTableMm: line.polylineTableMm?.map((p) => translate(p, line.areaId)),
            ...line.circleTableMm ? { circleTableMm: {
              ...line.circleTableMm,
              center: translate(line.circleTableMm.center, line.areaId)
            } } : {}
          }))
        };
      }
      module.exports = { calibratePhysicalBoundary };
    }
  });

  // apps/three-game/src/core/model/proMatch84FullPhysicalBoundaries.js
  var require_proMatch84FullPhysicalBoundaries = __commonJS({
    "apps/three-game/src/core/model/proMatch84FullPhysicalBoundaries.js"(exports, module) {
      var PRO_MATCH_84_FULL_PHYSICAL_BOUNDARIES = {
        "version": 2,
        "source": "wpbsa-2005-6-parametric-runtime",
        "boundaryId": "pro-match-84",
        "boundaryName": "\u804C\u4E1A\u8D5B WPBSA \u53C2\u6570\u5316",
        "sourceImagePath": "../../assets/images/table/full-table-clean-aligned-broadcast-green-smooth-edge10.png",
        "imagePhysicalRectPx": {
          "x": 103,
          "y": 63,
          "width": 2010,
          "height": 1085
        },
        "coordinateSystem": "center-origin-mm",
        "areas": [
          {
            "id": "rail-0",
            "kind": "straight-rail-area",
            "name": "\u76F4\u7EBF\u5E93\u8FB9 1",
            "boundaryTypes": [
              "straightRail"
            ],
            "focusImageRect": {
              "x": 1079.757,
              "y": 30.217,
              "width": 1043.798,
              "height": 180
            }
          },
          {
            "id": "rail-1",
            "kind": "straight-rail-area",
            "name": "\u76F4\u7EBF\u5E93\u8FB9 2",
            "boundaryTypes": [
              "straightRail"
            ],
            "focusImageRect": {
              "x": 1992.533,
              "y": 79.18,
              "width": 180,
              "height": 1052.64
            }
          },
          {
            "id": "rail-2",
            "kind": "straight-rail-area",
            "name": "\u76F4\u7EBF\u5E93\u8FB9 3",
            "boundaryTypes": [
              "straightRail"
            ],
            "focusImageRect": {
              "x": 1079.757,
              "y": 1000.783,
              "width": 1043.798,
              "height": 180
            }
          },
          {
            "id": "rail-3",
            "kind": "straight-rail-area",
            "name": "\u76F4\u7EBF\u5E93\u8FB9 4",
            "boundaryTypes": [
              "straightRail"
            ],
            "focusImageRect": {
              "x": 92.445,
              "y": 1000.783,
              "width": 1043.798,
              "height": 180
            }
          },
          {
            "id": "rail-4",
            "kind": "straight-rail-area",
            "name": "\u76F4\u7EBF\u5E93\u8FB9 5",
            "boundaryTypes": [
              "straightRail"
            ],
            "focusImageRect": {
              "x": 43.467,
              "y": 79.18,
              "width": 180,
              "height": 1052.64
            }
          },
          {
            "id": "rail-5",
            "kind": "straight-rail-area",
            "name": "\u76F4\u7EBF\u5E93\u8FB9 6",
            "boundaryTypes": [
              "straightRail"
            ],
            "focusImageRect": {
              "x": 92.445,
              "y": 30.217,
              "width": 1043.798,
              "height": 180
            }
          },
          {
            "id": "middle-top",
            "kind": "pocket-area",
            "name": "middle-top (middle)",
            "pocketId": "middle-top",
            "boundaryTypes": [
              "pocketRail",
              "dropJudge",
              "blackHole"
            ],
            "focusImageRect": {
              "x": 916.243,
              "y": -67,
              "width": 383.515,
              "height": 317.218
            }
          },
          {
            "id": "corner-top-right",
            "kind": "pocket-area",
            "name": "corner-top-right (corner)",
            "pocketId": "corner-top-right",
            "boundaryTypes": [
              "pocketRail",
              "dropJudge",
              "blackHole"
            ],
            "focusImageRect": {
              "x": 1918.556,
              "y": -23.754,
              "width": 307.955,
              "height": 307.934
            }
          },
          {
            "id": "corner-bottom-right",
            "kind": "pocket-area",
            "name": "corner-bottom-right (corner)",
            "pocketId": "corner-bottom-right",
            "boundaryTypes": [
              "pocketRail",
              "dropJudge",
              "blackHole"
            ],
            "focusImageRect": {
              "x": 1918.556,
              "y": 926.82,
              "width": 307.955,
              "height": 307.934
            }
          },
          {
            "id": "middle-bottom",
            "kind": "pocket-area",
            "name": "middle-bottom (middle)",
            "pocketId": "middle-bottom",
            "boundaryTypes": [
              "pocketRail",
              "dropJudge",
              "blackHole"
            ],
            "focusImageRect": {
              "x": 916.243,
              "y": 960.782,
              "width": 383.515,
              "height": 317.218
            }
          },
          {
            "id": "corner-bottom-left",
            "kind": "pocket-area",
            "name": "corner-bottom-left (corner)",
            "pocketId": "corner-bottom-left",
            "boundaryTypes": [
              "pocketRail",
              "dropJudge",
              "blackHole"
            ],
            "focusImageRect": {
              "x": -10.51,
              "y": 926.82,
              "width": 307.955,
              "height": 307.934
            }
          },
          {
            "id": "corner-top-left",
            "kind": "pocket-area",
            "name": "corner-top-left (corner)",
            "pocketId": "corner-top-left",
            "boundaryTypes": [
              "pocketRail",
              "dropJudge",
              "blackHole"
            ],
            "focusImageRect": {
              "x": -10.51,
              "y": -23.754,
              "width": 307.955,
              "height": 307.934
            }
          }
        ],
        "lines": [
          {
            "id": "table-rail-0",
            "name": "\u76F4\u7EBF\u5E93\u8FB9 1",
            "areaId": "rail-0",
            "boundaryType": "straightRail",
            "boundaryTypeName": "\u76F4\u7EBF\u5E93\u8FB9\u533A",
            "tool": "line",
            "toolName": "\u76F4\u7EBF",
            "source": "table-boundary-preset",
            "outputPointCount": 2,
            "endpointContact": {
              "startDistancePx": null,
              "endDistancePx": null,
              "startEndpointDistancePx": null,
              "endEndpointDistancePx": null
            },
            "controlImagePx": [
              [
                1169.757,
                120.217
              ],
              [
                2033.555,
                120.217
              ]
            ],
            "controlTableMm": [
              [
                113.211,
                -889.849
              ],
              [
                1696.706,
                -889.849
              ]
            ],
            "polylineImagePx": [
              [
                1169.757,
                120.217
              ],
              [
                2033.555,
                120.217
              ]
            ],
            "polylineTableMm": [
              [
                113.211,
                -889.849
              ],
              [
                1696.706,
                -889.849
              ]
            ]
          },
          {
            "id": "table-rail-1",
            "name": "\u76F4\u7EBF\u5E93\u8FB9 2",
            "areaId": "rail-1",
            "boundaryType": "straightRail",
            "boundaryTypeName": "\u76F4\u7EBF\u5E93\u8FB9\u533A",
            "tool": "line",
            "toolName": "\u76F4\u7EBF",
            "source": "table-boundary-preset",
            "outputPointCount": 2,
            "endpointContact": {
              "startDistancePx": null,
              "endDistancePx": null,
              "startEndpointDistancePx": null,
              "endEndpointDistancePx": null
            },
            "controlImagePx": [
              [
                2082.533,
                169.18
              ],
              [
                2082.533,
                1041.82
              ]
            ],
            "controlTableMm": [
              [
                1786.491,
                -800.067
              ],
              [
                1786.491,
                800.067
              ]
            ],
            "polylineImagePx": [
              [
                2082.533,
                169.18
              ],
              [
                2082.533,
                1041.82
              ]
            ],
            "polylineTableMm": [
              [
                1786.491,
                -800.067
              ],
              [
                1786.491,
                800.067
              ]
            ]
          },
          {
            "id": "table-rail-2",
            "name": "\u76F4\u7EBF\u5E93\u8FB9 3",
            "areaId": "rail-2",
            "boundaryType": "straightRail",
            "boundaryTypeName": "\u76F4\u7EBF\u5E93\u8FB9\u533A",
            "tool": "line",
            "toolName": "\u76F4\u7EBF",
            "source": "table-boundary-preset",
            "outputPointCount": 2,
            "endpointContact": {
              "startDistancePx": null,
              "endDistancePx": null,
              "startEndpointDistancePx": null,
              "endEndpointDistancePx": null
            },
            "controlImagePx": [
              [
                2033.555,
                1090.783
              ],
              [
                1169.757,
                1090.783
              ]
            ],
            "controlTableMm": [
              [
                1696.706,
                889.849
              ],
              [
                113.211,
                889.849
              ]
            ],
            "polylineImagePx": [
              [
                2033.555,
                1090.783
              ],
              [
                1169.757,
                1090.783
              ]
            ],
            "polylineTableMm": [
              [
                1696.706,
                889.849
              ],
              [
                113.211,
                889.849
              ]
            ]
          },
          {
            "id": "table-rail-3",
            "name": "\u76F4\u7EBF\u5E93\u8FB9 4",
            "areaId": "rail-3",
            "boundaryType": "straightRail",
            "boundaryTypeName": "\u76F4\u7EBF\u5E93\u8FB9\u533A",
            "tool": "line",
            "toolName": "\u76F4\u7EBF",
            "source": "table-boundary-preset",
            "outputPointCount": 2,
            "endpointContact": {
              "startDistancePx": null,
              "endDistancePx": null,
              "startEndpointDistancePx": null,
              "endEndpointDistancePx": null
            },
            "controlImagePx": [
              [
                1046.243,
                1090.783
              ],
              [
                182.445,
                1090.783
              ]
            ],
            "controlTableMm": [
              [
                -113.211,
                889.849
              ],
              [
                -1696.706,
                889.849
              ]
            ],
            "polylineImagePx": [
              [
                1046.243,
                1090.783
              ],
              [
                182.445,
                1090.783
              ]
            ],
            "polylineTableMm": [
              [
                -113.211,
                889.849
              ],
              [
                -1696.706,
                889.849
              ]
            ]
          },
          {
            "id": "table-rail-4",
            "name": "\u76F4\u7EBF\u5E93\u8FB9 5",
            "areaId": "rail-4",
            "boundaryType": "straightRail",
            "boundaryTypeName": "\u76F4\u7EBF\u5E93\u8FB9\u533A",
            "tool": "line",
            "toolName": "\u76F4\u7EBF",
            "source": "table-boundary-preset",
            "outputPointCount": 2,
            "endpointContact": {
              "startDistancePx": null,
              "endDistancePx": null,
              "startEndpointDistancePx": null,
              "endEndpointDistancePx": null
            },
            "controlImagePx": [
              [
                133.467,
                1041.82
              ],
              [
                133.467,
                169.18
              ]
            ],
            "controlTableMm": [
              [
                -1786.491,
                800.067
              ],
              [
                -1786.491,
                -800.067
              ]
            ],
            "polylineImagePx": [
              [
                133.467,
                1041.82
              ],
              [
                133.467,
                169.18
              ]
            ],
            "polylineTableMm": [
              [
                -1786.491,
                800.067
              ],
              [
                -1786.491,
                -800.067
              ]
            ]
          },
          {
            "id": "table-rail-5",
            "name": "\u76F4\u7EBF\u5E93\u8FB9 6",
            "areaId": "rail-5",
            "boundaryType": "straightRail",
            "boundaryTypeName": "\u76F4\u7EBF\u5E93\u8FB9\u533A",
            "tool": "line",
            "toolName": "\u76F4\u7EBF",
            "source": "table-boundary-preset",
            "outputPointCount": 2,
            "endpointContact": {
              "startDistancePx": null,
              "endDistancePx": null,
              "startEndpointDistancePx": null,
              "endEndpointDistancePx": null
            },
            "controlImagePx": [
              [
                182.445,
                120.217
              ],
              [
                1046.243,
                120.217
              ]
            ],
            "controlTableMm": [
              [
                -1696.706,
                -889.849
              ],
              [
                -113.211,
                -889.849
              ]
            ],
            "polylineImagePx": [
              [
                182.445,
                120.217
              ],
              [
                1046.243,
                120.217
              ]
            ],
            "polylineTableMm": [
              [
                -1696.706,
                -889.849
              ],
              [
                -113.211,
                -889.849
              ]
            ]
          },
          {
            "id": "boundary-mpdxxgec-1111",
            "name": "\u7F51\u888B\u9ED1\u6D1E\u533A 4",
            "areaId": "middle-top",
            "boundaryType": "blackHole",
            "boundaryTypeName": "\u7F51\u888B\u9ED1\u6D1E\u533A",
            "tool": "circle",
            "toolName": "\u5706\u5F62",
            "source": "editor",
            "outputPointCount": 20,
            "endpointContact": null,
            "controlImagePx": [
              [
                1108.421,
                93.34
              ]
            ],
            "controlTableMm": [
              [
                0.772,
                -939.133
              ]
            ],
            "polylineImagePx": [
              [
                1123.997,
                93.34
              ],
              [
                1123.235,
                98.153
              ],
              [
                1121.022,
                102.495
              ],
              [
                1117.576,
                105.941
              ],
              [
                1113.234,
                108.154
              ],
              [
                1108.421,
                108.916
              ],
              [
                1103.608,
                108.154
              ],
              [
                1099.266,
                105.941
              ],
              [
                1095.82,
                102.495
              ],
              [
                1093.607,
                98.153
              ],
              [
                1092.845,
                93.34
              ],
              [
                1093.607,
                88.527
              ],
              [
                1095.82,
                84.185
              ],
              [
                1099.266,
                80.739
              ],
              [
                1103.608,
                78.526
              ],
              [
                1108.421,
                77.764
              ],
              [
                1113.234,
                78.526
              ],
              [
                1117.576,
                80.739
              ],
              [
                1121.022,
                84.185
              ],
              [
                1123.235,
                88.527
              ],
              [
                1123.997,
                93.34
              ]
            ],
            "polylineTableMm": [
              [
                29.325,
                -939.133
              ],
              [
                27.928,
                -930.307
              ],
              [
                23.872,
                -922.345
              ],
              [
                17.555,
                -916.026
              ],
              [
                9.595,
                -911.969
              ],
              [
                0.772,
                -910.571
              ],
              [
                -8.052,
                -911.969
              ],
              [
                -16.012,
                -916.026
              ],
              [
                -22.329,
                -922.345
              ],
              [
                -26.384,
                -930.307
              ],
              [
                -27.782,
                -939.133
              ],
              [
                -26.384,
                -947.959
              ],
              [
                -22.329,
                -955.921
              ],
              [
                -16.012,
                -962.239
              ],
              [
                -8.052,
                -966.296
              ],
              [
                0.772,
                -967.694
              ],
              [
                9.595,
                -966.296
              ],
              [
                17.555,
                -962.239
              ],
              [
                23.872,
                -955.921
              ],
              [
                27.928,
                -947.959
              ],
              [
                29.325,
                -939.133
              ]
            ],
            "circleImagePx": {
              "center": [
                1108.421,
                93.34
              ],
              "radius": 15.576
            },
            "circleTableMm": {
              "center": [
                0.772,
                -939.133
              ],
              "radius": 28.554
            }
          },
          {
            "id": "boundary-mpdxxyrj-2976",
            "name": "\u7F51\u888B\u9ED1\u6D1E\u533A 4",
            "areaId": "middle-bottom",
            "boundaryType": "blackHole",
            "boundaryTypeName": "\u7F51\u888B\u9ED1\u6D1E\u533A",
            "tool": "circle",
            "toolName": "\u5706\u5F62",
            "source": "editor",
            "outputPointCount": 20,
            "endpointContact": null,
            "controlImagePx": [
              [
                1107.891,
                1113.304
              ]
            ],
            "controlTableMm": [
              [
                -0.2,
                931.145
              ]
            ],
            "polylineImagePx": [
              [
                1123.508,
                1113.304
              ],
              [
                1122.744,
                1118.13
              ],
              [
                1120.525,
                1122.483
              ],
              [
                1117.07,
                1125.938
              ],
              [
                1112.717,
                1128.157
              ],
              [
                1107.891,
                1128.921
              ],
              [
                1103.065,
                1128.157
              ],
              [
                1098.712,
                1125.938
              ],
              [
                1095.257,
                1122.483
              ],
              [
                1093.038,
                1118.13
              ],
              [
                1092.274,
                1113.304
              ],
              [
                1093.038,
                1108.478
              ],
              [
                1095.257,
                1104.125
              ],
              [
                1098.712,
                1100.67
              ],
              [
                1103.065,
                1098.451
              ],
              [
                1107.891,
                1097.687
              ],
              [
                1112.717,
                1098.451
              ],
              [
                1117.07,
                1100.67
              ],
              [
                1120.525,
                1104.125
              ],
              [
                1122.744,
                1108.478
              ],
              [
                1123.508,
                1113.304
              ]
            ],
            "polylineTableMm": [
              [
                28.429,
                931.145
              ],
              [
                27.028,
                939.994
              ],
              [
                22.961,
                947.977
              ],
              [
                16.628,
                954.313
              ],
              [
                8.647,
                958.38
              ],
              [
                -0.2,
                959.782
              ],
              [
                -9.047,
                958.38
              ],
              [
                -17.027,
                954.313
              ],
              [
                -23.361,
                947.977
              ],
              [
                -27.427,
                939.994
              ],
              [
                -28.829,
                931.145
              ],
              [
                -27.427,
                922.296
              ],
              [
                -23.361,
                914.313
              ],
              [
                -17.027,
                907.978
              ],
              [
                -9.047,
                903.91
              ],
              [
                -0.2,
                902.509
              ],
              [
                8.647,
                903.91
              ],
              [
                16.628,
                907.978
              ],
              [
                22.961,
                914.313
              ],
              [
                27.028,
                922.296
              ],
              [
                28.429,
                931.145
              ]
            ],
            "circleImagePx": {
              "center": [
                1107.891,
                1113.304
              ],
              "radius": 15.617
            },
            "circleTableMm": {
              "center": [
                -0.2,
                931.145
              ],
              "radius": 28.629
            }
          },
          {
            "id": "boundary-mpdxz7ag-3750",
            "name": "\u7F51\u888B\u9ED1\u6D1E\u533A 6",
            "areaId": "corner-top-right",
            "boundaryType": "blackHole",
            "boundaryTypeName": "\u7F51\u888B\u9ED1\u6D1E\u533A",
            "tool": "circle",
            "toolName": "\u5706\u5F62",
            "source": "editor",
            "outputPointCount": 20,
            "endpointContact": null,
            "controlImagePx": [
              [
                2083.017,
                111.332
              ]
            ],
            "controlTableMm": [
              [
                1787.378,
                -906.141
              ]
            ],
            "polylineImagePx": [
              [
                2096.845,
                111.332
              ],
              [
                2096.168,
                115.605
              ],
              [
                2094.204,
                119.46
              ],
              [
                2091.145,
                122.519
              ],
              [
                2087.29,
                124.483
              ],
              [
                2083.017,
                125.16
              ],
              [
                2078.744,
                124.483
              ],
              [
                2074.889,
                122.519
              ],
              [
                2071.83,
                119.46
              ],
              [
                2069.866,
                115.605
              ],
              [
                2069.189,
                111.332
              ],
              [
                2069.866,
                107.059
              ],
              [
                2071.83,
                103.204
              ],
              [
                2074.889,
                100.145
              ],
              [
                2078.744,
                98.181
              ],
              [
                2083.017,
                97.504
              ],
              [
                2087.29,
                98.181
              ],
              [
                2091.145,
                100.145
              ],
              [
                2094.204,
                103.204
              ],
              [
                2096.168,
                107.059
              ],
              [
                2096.845,
                111.332
              ]
            ],
            "polylineTableMm": [
              [
                1812.727,
                -906.141
              ],
              [
                1811.487,
                -898.306
              ],
              [
                1807.886,
                -891.237
              ],
              [
                1802.278,
                -885.628
              ],
              [
                1795.212,
                -882.026
              ],
              [
                1787.378,
                -880.785
              ],
              [
                1779.545,
                -882.026
              ],
              [
                1772.478,
                -885.628
              ],
              [
                1766.87,
                -891.237
              ],
              [
                1763.27,
                -898.306
              ],
              [
                1762.029,
                -906.141
              ],
              [
                1763.27,
                -913.977
              ],
              [
                1766.87,
                -921.045
              ],
              [
                1772.478,
                -926.655
              ],
              [
                1779.545,
                -930.256
              ],
              [
                1787.378,
                -931.497
              ],
              [
                1795.212,
                -930.256
              ],
              [
                1802.278,
                -926.655
              ],
              [
                1807.886,
                -921.045
              ],
              [
                1811.487,
                -913.977
              ],
              [
                1812.727,
                -906.141
              ]
            ],
            "circleImagePx": {
              "center": [
                2083.017,
                111.332
              ],
              "radius": 13.828
            },
            "circleTableMm": {
              "center": [
                1787.378,
                -906.141
              ],
              "radius": 25.349
            }
          },
          {
            "id": "line-mpdy0414-0-1016",
            "name": "\u7F51\u888B\u9ED1\u6D1E\u533A copy",
            "areaId": "corner-bottom-right",
            "boundaryType": "blackHole",
            "boundaryTypeName": "\u7F51\u888B\u9ED1\u6D1E\u533A",
            "tool": "circle",
            "toolName": "\u5706\u5F62",
            "source": "editor copy",
            "outputPointCount": 20,
            "endpointContact": null,
            "controlImagePx": [
              [
                2083.482,
                1097.26
              ]
            ],
            "controlTableMm": [
              [
                1788.231,
                901.726
              ]
            ],
            "polylineImagePx": [
              [
                2097.31,
                1097.26
              ],
              [
                2096.633,
                1101.533
              ],
              [
                2094.669,
                1105.388
              ],
              [
                2091.61,
                1108.447
              ],
              [
                2087.755,
                1110.411
              ],
              [
                2083.482,
                1111.088
              ],
              [
                2079.209,
                1110.411
              ],
              [
                2075.354,
                1108.447
              ],
              [
                2072.295,
                1105.388
              ],
              [
                2070.331,
                1101.533
              ],
              [
                2069.654,
                1097.26
              ],
              [
                2070.331,
                1092.987
              ],
              [
                2072.295,
                1089.132
              ],
              [
                2075.354,
                1086.073
              ],
              [
                2079.209,
                1084.109
              ],
              [
                2083.482,
                1083.432
              ],
              [
                2087.755,
                1084.109
              ],
              [
                2091.61,
                1086.073
              ],
              [
                2094.669,
                1089.132
              ],
              [
                2096.633,
                1092.987
              ],
              [
                2097.31,
                1097.26
              ]
            ],
            "polylineTableMm": [
              [
                1813.58,
                901.726
              ],
              [
                1812.339,
                909.561
              ],
              [
                1808.739,
                916.63
              ],
              [
                1803.131,
                922.239
              ],
              [
                1796.064,
                925.841
              ],
              [
                1788.231,
                927.082
              ],
              [
                1780.397,
                925.841
              ],
              [
                1773.331,
                922.239
              ],
              [
                1767.723,
                916.63
              ],
              [
                1764.122,
                909.561
              ],
              [
                1762.882,
                901.726
              ],
              [
                1764.122,
                893.89
              ],
              [
                1767.723,
                886.822
              ],
              [
                1773.331,
                881.212
              ],
              [
                1780.397,
                877.611
              ],
              [
                1788.231,
                876.37
              ],
              [
                1796.064,
                877.611
              ],
              [
                1803.131,
                881.212
              ],
              [
                1808.739,
                886.822
              ],
              [
                1812.339,
                893.89
              ],
              [
                1813.58,
                901.726
              ]
            ],
            "circleImagePx": {
              "center": [
                2083.482,
                1097.26
              ],
              "radius": 13.828
            },
            "circleTableMm": {
              "center": [
                1788.231,
                901.726
              ],
              "radius": 25.349
            }
          },
          {
            "id": "line-mpdy0d0h-0-5919",
            "name": "\u7F51\u888B\u9ED1\u6D1E\u533A copy",
            "areaId": "corner-bottom-left",
            "boundaryType": "blackHole",
            "boundaryTypeName": "\u7F51\u888B\u9ED1\u6D1E\u533A",
            "tool": "circle",
            "toolName": "\u5706\u5F62",
            "source": "editor copy",
            "outputPointCount": 20,
            "endpointContact": null,
            "controlImagePx": [
              [
                133.277,
                1096.282
              ]
            ],
            "controlTableMm": [
              [
                -1786.839,
                899.932
              ]
            ],
            "polylineImagePx": [
              [
                147.105,
                1096.282
              ],
              [
                146.428,
                1100.555
              ],
              [
                144.464,
                1104.41
              ],
              [
                141.405,
                1107.469
              ],
              [
                137.55,
                1109.433
              ],
              [
                133.277,
                1110.11
              ],
              [
                129.004,
                1109.433
              ],
              [
                125.149,
                1107.469
              ],
              [
                122.09,
                1104.41
              ],
              [
                120.126,
                1100.555
              ],
              [
                119.449,
                1096.282
              ],
              [
                120.126,
                1092.009
              ],
              [
                122.09,
                1088.154
              ],
              [
                125.149,
                1085.095
              ],
              [
                129.004,
                1083.131
              ],
              [
                133.277,
                1082.454
              ],
              [
                137.55,
                1083.131
              ],
              [
                141.405,
                1085.095
              ],
              [
                144.464,
                1088.154
              ],
              [
                146.428,
                1092.009
              ],
              [
                147.105,
                1096.282
              ]
            ],
            "polylineTableMm": [
              [
                -1761.49,
                899.932
              ],
              [
                -1762.731,
                907.768
              ],
              [
                -1766.331,
                914.836
              ],
              [
                -1771.939,
                920.446
              ],
              [
                -1779.006,
                924.047
              ],
              [
                -1786.839,
                925.288
              ],
              [
                -1794.673,
                924.047
              ],
              [
                -1801.739,
                920.446
              ],
              [
                -1807.347,
                914.836
              ],
              [
                -1810.948,
                907.768
              ],
              [
                -1812.189,
                899.932
              ],
              [
                -1810.948,
                892.097
              ],
              [
                -1807.347,
                885.029
              ],
              [
                -1801.739,
                879.419
              ],
              [
                -1794.673,
                875.817
              ],
              [
                -1786.839,
                874.576
              ],
              [
                -1779.006,
                875.817
              ],
              [
                -1771.939,
                879.419
              ],
              [
                -1766.331,
                885.029
              ],
              [
                -1762.731,
                892.097
              ],
              [
                -1761.49,
                899.932
              ]
            ],
            "circleImagePx": {
              "center": [
                133.277,
                1096.282
              ],
              "radius": 13.828
            },
            "circleTableMm": {
              "center": [
                -1786.839,
                899.932
              ],
              "radius": 25.349
            }
          },
          {
            "id": "line-mpdy0kq4-0-1069",
            "name": "\u7F51\u888B\u9ED1\u6D1E\u533A copy",
            "areaId": "corner-top-left",
            "boundaryType": "blackHole",
            "boundaryTypeName": "\u7F51\u888B\u9ED1\u6D1E\u533A",
            "tool": "circle",
            "toolName": "\u5706\u5F62",
            "source": "editor copy",
            "outputPointCount": 20,
            "endpointContact": null,
            "controlImagePx": [
              [
                133.374,
                111.734
              ]
            ],
            "controlTableMm": [
              [
                -1786.662,
                -905.404
              ]
            ],
            "polylineImagePx": [
              [
                147.202,
                111.734
              ],
              [
                146.525,
                116.007
              ],
              [
                144.561,
                119.862
              ],
              [
                141.502,
                122.921
              ],
              [
                137.647,
                124.885
              ],
              [
                133.374,
                125.562
              ],
              [
                129.101,
                124.885
              ],
              [
                125.246,
                122.921
              ],
              [
                122.187,
                119.862
              ],
              [
                120.223,
                116.007
              ],
              [
                119.546,
                111.734
              ],
              [
                120.223,
                107.461
              ],
              [
                122.187,
                103.606
              ],
              [
                125.246,
                100.547
              ],
              [
                129.101,
                98.583
              ],
              [
                133.374,
                97.906
              ],
              [
                137.647,
                98.583
              ],
              [
                141.502,
                100.547
              ],
              [
                144.561,
                103.606
              ],
              [
                146.525,
                107.461
              ],
              [
                147.202,
                111.734
              ]
            ],
            "polylineTableMm": [
              [
                -1761.312,
                -905.404
              ],
              [
                -1762.553,
                -897.569
              ],
              [
                -1766.154,
                -890.5
              ],
              [
                -1771.762,
                -884.891
              ],
              [
                -1778.828,
                -881.289
              ],
              [
                -1786.662,
                -880.048
              ],
              [
                -1794.495,
                -881.289
              ],
              [
                -1801.561,
                -884.891
              ],
              [
                -1807.169,
                -890.5
              ],
              [
                -1810.77,
                -897.569
              ],
              [
                -1812.011,
                -905.404
              ],
              [
                -1810.77,
                -913.24
              ],
              [
                -1807.169,
                -920.308
              ],
              [
                -1801.561,
                -925.918
              ],
              [
                -1794.495,
                -929.519
              ],
              [
                -1786.662,
                -930.76
              ],
              [
                -1778.828,
                -929.519
              ],
              [
                -1771.762,
                -925.918
              ],
              [
                -1766.154,
                -920.308
              ],
              [
                -1762.553,
                -913.24
              ],
              [
                -1761.312,
                -905.404
              ]
            ],
            "circleImagePx": {
              "center": [
                133.374,
                111.734
              ],
              "radius": 13.828
            },
            "circleTableMm": {
              "center": [
                -1786.662,
                -905.404
              ],
              "radius": 25.349
            }
          },
          {
            "id": "middle-top:wpbsa-param:left-pocket-rail",
            "name": "middle-top left pocket rail",
            "areaId": "middle-top",
            "boundaryType": "pocketRail",
            "boundaryTypeName": "\u888B\u53E3\u5E93\u8FB9\u533A",
            "tool": "parametricPolyline",
            "toolName": "\u53C2\u6570\u5316\u591A\u6BB5\u7EBF",
            "source": "wpbsa-2005-6-parametric-candidate",
            "outputPointCount": 39,
            "polylineTableMm": [
              [
                -113.211,
                -889.849
              ],
              [
                -110.4,
                -889.898
              ],
              [
                -107.592,
                -890.043
              ],
              [
                -104.79,
                -890.285
              ],
              [
                -101.999,
                -890.624
              ],
              [
                -99.221,
                -891.06
              ],
              [
                -96.46,
                -891.59
              ],
              [
                -93.719,
                -892.216
              ],
              [
                -91.001,
                -892.936
              ],
              [
                -88.31,
                -893.749
              ],
              [
                -85.648,
                -894.655
              ],
              [
                -83.019,
                -895.652
              ],
              [
                -80.426,
                -896.74
              ],
              [
                -77.872,
                -897.916
              ],
              [
                -75.36,
                -899.179
              ],
              [
                -72.893,
                -900.529
              ],
              [
                -70.475,
                -901.963
              ],
              [
                -68.107,
                -903.479
              ],
              [
                -65.793,
                -905.077
              ],
              [
                -63.586,
                -906.818
              ],
              [
                -62.057,
                -908.146
              ],
              [
                -60.525,
                -909.467
              ],
              [
                -59.044,
                -910.843
              ],
              [
                -57.614,
                -912.274
              ],
              [
                -56.239,
                -913.756
              ],
              [
                -54.919,
                -915.288
              ],
              [
                -53.657,
                -916.868
              ],
              [
                -52.455,
                -918.494
              ],
              [
                -51.313,
                -920.163
              ],
              [
                -50.234,
                -921.873
              ],
              [
                -49.22,
                -923.622
              ],
              [
                -48.27,
                -925.408
              ],
              [
                -47.388,
                -927.227
              ],
              [
                -46.573,
                -929.078
              ],
              [
                -45.828,
                -930.958
              ],
              [
                -45.153,
                -932.864
              ],
              [
                -44.549,
                -934.794
              ],
              [
                -44.017,
                -936.745
              ],
              [
                -43.557,
                -938.714
              ]
            ],
            "polylineImagePx": [
              [
                1046.243,
                120.217
              ],
              [
                1047.777,
                120.191
              ],
              [
                1049.309,
                120.111
              ],
              [
                1050.837,
                119.979
              ],
              [
                1052.359,
                119.794
              ],
              [
                1053.875,
                119.557
              ],
              [
                1055.381,
                119.267
              ],
              [
                1056.876,
                118.926
              ],
              [
                1058.359,
                118.534
              ],
              [
                1059.827,
                118.09
              ],
              [
                1061.279,
                117.596
              ],
              [
                1062.713,
                117.052
              ],
              [
                1064.128,
                116.459
              ],
              [
                1065.521,
                115.818
              ],
              [
                1066.891,
                115.129
              ],
              [
                1068.237,
                114.393
              ],
              [
                1069.556,
                113.611
              ],
              [
                1070.848,
                112.784
              ],
              [
                1072.11,
                111.913
              ],
              [
                1073.314,
                110.963
              ],
              [
                1074.148,
                110.239
              ],
              [
                1074.983,
                109.518
              ],
              [
                1075.791,
                108.768
              ],
              [
                1076.571,
                107.988
              ],
              [
                1077.322,
                107.179
              ],
              [
                1078.041,
                106.344
              ],
              [
                1078.73,
                105.482
              ],
              [
                1079.386,
                104.595
              ],
              [
                1080.009,
                103.685
              ],
              [
                1080.597,
                102.752
              ],
              [
                1081.151,
                101.799
              ],
              [
                1081.668,
                100.825
              ],
              [
                1082.15,
                99.833
              ],
              [
                1082.594,
                98.823
              ],
              [
                1083.001,
                97.798
              ],
              [
                1083.369,
                96.759
              ],
              [
                1083.699,
                95.706
              ],
              [
                1083.989,
                94.642
              ],
              [
                1084.24,
                93.568
              ]
            ]
          },
          {
            "id": "middle-top:wpbsa-param:right-pocket-rail",
            "name": "middle-top right pocket rail",
            "areaId": "middle-top",
            "boundaryType": "pocketRail",
            "boundaryTypeName": "\u888B\u53E3\u5E93\u8FB9\u533A",
            "tool": "parametricPolyline",
            "toolName": "\u53C2\u6570\u5316\u591A\u6BB5\u7EBF",
            "source": "wpbsa-2005-6-parametric-candidate",
            "outputPointCount": 39,
            "polylineTableMm": [
              [
                113.211,
                -889.849
              ],
              [
                110.4,
                -889.898
              ],
              [
                107.592,
                -890.043
              ],
              [
                104.79,
                -890.285
              ],
              [
                101.999,
                -890.624
              ],
              [
                99.221,
                -891.06
              ],
              [
                96.46,
                -891.59
              ],
              [
                93.719,
                -892.216
              ],
              [
                91.001,
                -892.936
              ],
              [
                88.31,
                -893.749
              ],
              [
                85.648,
                -894.655
              ],
              [
                83.019,
                -895.652
              ],
              [
                80.426,
                -896.74
              ],
              [
                77.872,
                -897.916
              ],
              [
                75.36,
                -899.179
              ],
              [
                72.893,
                -900.529
              ],
              [
                70.475,
                -901.963
              ],
              [
                68.107,
                -903.479
              ],
              [
                65.793,
                -905.077
              ],
              [
                63.586,
                -906.818
              ],
              [
                62.057,
                -908.146
              ],
              [
                60.525,
                -909.467
              ],
              [
                59.044,
                -910.843
              ],
              [
                57.614,
                -912.274
              ],
              [
                56.239,
                -913.756
              ],
              [
                54.919,
                -915.288
              ],
              [
                53.657,
                -916.868
              ],
              [
                52.455,
                -918.494
              ],
              [
                51.313,
                -920.163
              ],
              [
                50.234,
                -921.873
              ],
              [
                49.22,
                -923.622
              ],
              [
                48.27,
                -925.408
              ],
              [
                47.388,
                -927.227
              ],
              [
                46.573,
                -929.078
              ],
              [
                45.828,
                -930.958
              ],
              [
                45.153,
                -932.864
              ],
              [
                44.549,
                -934.794
              ],
              [
                44.017,
                -936.745
              ],
              [
                43.557,
                -938.714
              ]
            ],
            "polylineImagePx": [
              [
                1169.757,
                120.217
              ],
              [
                1168.223,
                120.191
              ],
              [
                1166.691,
                120.111
              ],
              [
                1165.163,
                119.979
              ],
              [
                1163.641,
                119.794
              ],
              [
                1162.125,
                119.557
              ],
              [
                1160.619,
                119.267
              ],
              [
                1159.124,
                118.926
              ],
              [
                1157.641,
                118.534
              ],
              [
                1156.173,
                118.09
              ],
              [
                1154.721,
                117.596
              ],
              [
                1153.287,
                117.052
              ],
              [
                1151.872,
                116.459
              ],
              [
                1150.479,
                115.818
              ],
              [
                1149.109,
                115.129
              ],
              [
                1147.763,
                114.393
              ],
              [
                1146.444,
                113.611
              ],
              [
                1145.152,
                112.784
              ],
              [
                1143.89,
                111.913
              ],
              [
                1142.686,
                110.963
              ],
              [
                1141.852,
                110.239
              ],
              [
                1141.017,
                109.518
              ],
              [
                1140.209,
                108.768
              ],
              [
                1139.429,
                107.988
              ],
              [
                1138.678,
                107.179
              ],
              [
                1137.959,
                106.344
              ],
              [
                1137.27,
                105.482
              ],
              [
                1136.614,
                104.595
              ],
              [
                1135.991,
                103.685
              ],
              [
                1135.403,
                102.752
              ],
              [
                1134.849,
                101.799
              ],
              [
                1134.332,
                100.825
              ],
              [
                1133.85,
                99.833
              ],
              [
                1133.406,
                98.823
              ],
              [
                1132.999,
                97.798
              ],
              [
                1132.631,
                96.759
              ],
              [
                1132.301,
                95.706
              ],
              [
                1132.011,
                94.642
              ],
              [
                1131.76,
                93.568
              ]
            ]
          },
          {
            "id": "middle-top:wpbsa-param:drop-judge",
            "name": "middle-top drop judge",
            "areaId": "middle-top",
            "boundaryType": "dropJudge",
            "boundaryTypeName": "\u843D\u888B\u5224\u5B9A\u533A",
            "tool": "parametricPolyline",
            "toolName": "\u53C2\u6570\u5316\u591A\u6BB5\u7EBF",
            "source": "wpbsa-2005-6-parametric-candidate",
            "outputPointCount": 20,
            "polylineTableMm": [
              [
                -50.338,
                -921.703
              ],
              [
                -47.355,
                -915.657
              ],
              [
                -43.65,
                -910.025
              ],
              [
                -39.279,
                -904.894
              ],
              [
                -34.308,
                -900.34
              ],
              [
                -28.814,
                -896.434
              ],
              [
                -22.88,
                -893.235
              ],
              [
                -16.597,
                -890.792
              ],
              [
                -10.06,
                -889.142
              ],
              [
                -3.371,
                -888.311
              ],
              [
                3.371,
                -888.311
              ],
              [
                10.06,
                -889.142
              ],
              [
                16.597,
                -890.792
              ],
              [
                22.88,
                -893.235
              ],
              [
                28.814,
                -896.434
              ],
              [
                34.308,
                -900.34
              ],
              [
                39.279,
                -904.894
              ],
              [
                43.65,
                -910.025
              ],
              [
                47.355,
                -915.657
              ],
              [
                50.338,
                -921.703
              ]
            ],
            "polylineImagePx": [
              [
                1080.54,
                102.846
              ],
              [
                1082.168,
                106.143
              ],
              [
                1084.189,
                109.214
              ],
              [
                1086.573,
                112.012
              ],
              [
                1089.285,
                114.496
              ],
              [
                1092.282,
                116.626
              ],
              [
                1095.519,
                118.371
              ],
              [
                1098.946,
                119.703
              ],
              [
                1102.512,
                120.602
              ],
              [
                1106.161,
                121.056
              ],
              [
                1109.839,
                121.056
              ],
              [
                1113.488,
                120.602
              ],
              [
                1117.054,
                119.703
              ],
              [
                1120.481,
                118.371
              ],
              [
                1123.718,
                116.626
              ],
              [
                1126.715,
                114.496
              ],
              [
                1129.427,
                112.012
              ],
              [
                1131.811,
                109.214
              ],
              [
                1133.832,
                106.143
              ],
              [
                1135.46,
                102.846
              ]
            ]
          },
          {
            "id": "middle-bottom:wpbsa-param:left-pocket-rail",
            "name": "middle-bottom left pocket rail",
            "areaId": "middle-bottom",
            "boundaryType": "pocketRail",
            "boundaryTypeName": "\u888B\u53E3\u5E93\u8FB9\u533A",
            "tool": "parametricPolyline",
            "toolName": "\u53C2\u6570\u5316\u591A\u6BB5\u7EBF",
            "source": "wpbsa-2005-6-parametric-candidate",
            "outputPointCount": 39,
            "polylineTableMm": [
              [
                -113.211,
                889.849
              ],
              [
                -110.4,
                889.898
              ],
              [
                -107.592,
                890.043
              ],
              [
                -104.79,
                890.285
              ],
              [
                -101.999,
                890.624
              ],
              [
                -99.221,
                891.06
              ],
              [
                -96.46,
                891.59
              ],
              [
                -93.719,
                892.216
              ],
              [
                -91.001,
                892.936
              ],
              [
                -88.31,
                893.749
              ],
              [
                -85.648,
                894.655
              ],
              [
                -83.019,
                895.652
              ],
              [
                -80.426,
                896.74
              ],
              [
                -77.872,
                897.916
              ],
              [
                -75.36,
                899.179
              ],
              [
                -72.893,
                900.529
              ],
              [
                -70.475,
                901.963
              ],
              [
                -68.107,
                903.479
              ],
              [
                -65.793,
                905.077
              ],
              [
                -63.586,
                906.818
              ],
              [
                -62.057,
                908.146
              ],
              [
                -60.525,
                909.467
              ],
              [
                -59.044,
                910.843
              ],
              [
                -57.614,
                912.274
              ],
              [
                -56.239,
                913.756
              ],
              [
                -54.919,
                915.288
              ],
              [
                -53.657,
                916.868
              ],
              [
                -52.455,
                918.494
              ],
              [
                -51.313,
                920.163
              ],
              [
                -50.234,
                921.873
              ],
              [
                -49.22,
                923.622
              ],
              [
                -48.27,
                925.408
              ],
              [
                -47.388,
                927.227
              ],
              [
                -46.573,
                929.078
              ],
              [
                -45.828,
                930.958
              ],
              [
                -45.153,
                932.864
              ],
              [
                -44.549,
                934.794
              ],
              [
                -44.017,
                936.745
              ],
              [
                -43.557,
                938.714
              ]
            ],
            "polylineImagePx": [
              [
                1046.243,
                1090.783
              ],
              [
                1047.777,
                1090.809
              ],
              [
                1049.309,
                1090.889
              ],
              [
                1050.837,
                1091.021
              ],
              [
                1052.359,
                1091.206
              ],
              [
                1053.875,
                1091.443
              ],
              [
                1055.381,
                1091.733
              ],
              [
                1056.876,
                1092.074
              ],
              [
                1058.359,
                1092.466
              ],
              [
                1059.827,
                1092.91
              ],
              [
                1061.279,
                1093.404
              ],
              [
                1062.713,
                1093.948
              ],
              [
                1064.128,
                1094.541
              ],
              [
                1065.521,
                1095.182
              ],
              [
                1066.891,
                1095.871
              ],
              [
                1068.237,
                1096.607
              ],
              [
                1069.556,
                1097.389
              ],
              [
                1070.848,
                1098.216
              ],
              [
                1072.11,
                1099.087
              ],
              [
                1073.314,
                1100.037
              ],
              [
                1074.148,
                1100.762
              ],
              [
                1074.983,
                1101.482
              ],
              [
                1075.791,
                1102.232
              ],
              [
                1076.571,
                1103.012
              ],
              [
                1077.322,
                1103.821
              ],
              [
                1078.041,
                1104.656
              ],
              [
                1078.73,
                1105.518
              ],
              [
                1079.386,
                1106.405
              ],
              [
                1080.009,
                1107.315
              ],
              [
                1080.597,
                1108.248
              ],
              [
                1081.151,
                1109.201
              ],
              [
                1081.668,
                1110.175
              ],
              [
                1082.15,
                1111.167
              ],
              [
                1082.594,
                1112.177
              ],
              [
                1083.001,
                1113.202
              ],
              [
                1083.369,
                1114.242
              ],
              [
                1083.699,
                1115.294
              ],
              [
                1083.989,
                1116.358
              ],
              [
                1084.24,
                1117.432
              ]
            ]
          },
          {
            "id": "middle-bottom:wpbsa-param:right-pocket-rail",
            "name": "middle-bottom right pocket rail",
            "areaId": "middle-bottom",
            "boundaryType": "pocketRail",
            "boundaryTypeName": "\u888B\u53E3\u5E93\u8FB9\u533A",
            "tool": "parametricPolyline",
            "toolName": "\u53C2\u6570\u5316\u591A\u6BB5\u7EBF",
            "source": "wpbsa-2005-6-parametric-candidate",
            "outputPointCount": 39,
            "polylineTableMm": [
              [
                113.211,
                889.849
              ],
              [
                110.4,
                889.898
              ],
              [
                107.592,
                890.043
              ],
              [
                104.79,
                890.285
              ],
              [
                101.999,
                890.624
              ],
              [
                99.221,
                891.06
              ],
              [
                96.46,
                891.59
              ],
              [
                93.719,
                892.216
              ],
              [
                91.001,
                892.936
              ],
              [
                88.31,
                893.749
              ],
              [
                85.648,
                894.655
              ],
              [
                83.019,
                895.652
              ],
              [
                80.426,
                896.74
              ],
              [
                77.872,
                897.916
              ],
              [
                75.36,
                899.179
              ],
              [
                72.893,
                900.529
              ],
              [
                70.475,
                901.963
              ],
              [
                68.107,
                903.479
              ],
              [
                65.793,
                905.077
              ],
              [
                63.586,
                906.818
              ],
              [
                62.057,
                908.146
              ],
              [
                60.525,
                909.467
              ],
              [
                59.044,
                910.843
              ],
              [
                57.614,
                912.274
              ],
              [
                56.239,
                913.756
              ],
              [
                54.919,
                915.288
              ],
              [
                53.657,
                916.868
              ],
              [
                52.455,
                918.494
              ],
              [
                51.313,
                920.163
              ],
              [
                50.234,
                921.873
              ],
              [
                49.22,
                923.622
              ],
              [
                48.27,
                925.408
              ],
              [
                47.388,
                927.227
              ],
              [
                46.573,
                929.078
              ],
              [
                45.828,
                930.958
              ],
              [
                45.153,
                932.864
              ],
              [
                44.549,
                934.794
              ],
              [
                44.017,
                936.745
              ],
              [
                43.557,
                938.714
              ]
            ],
            "polylineImagePx": [
              [
                1169.757,
                1090.783
              ],
              [
                1168.223,
                1090.809
              ],
              [
                1166.691,
                1090.889
              ],
              [
                1165.163,
                1091.021
              ],
              [
                1163.641,
                1091.206
              ],
              [
                1162.125,
                1091.443
              ],
              [
                1160.619,
                1091.733
              ],
              [
                1159.124,
                1092.074
              ],
              [
                1157.641,
                1092.466
              ],
              [
                1156.173,
                1092.91
              ],
              [
                1154.721,
                1093.404
              ],
              [
                1153.287,
                1093.948
              ],
              [
                1151.872,
                1094.541
              ],
              [
                1150.479,
                1095.182
              ],
              [
                1149.109,
                1095.871
              ],
              [
                1147.763,
                1096.607
              ],
              [
                1146.444,
                1097.389
              ],
              [
                1145.152,
                1098.216
              ],
              [
                1143.89,
                1099.087
              ],
              [
                1142.686,
                1100.037
              ],
              [
                1141.852,
                1100.762
              ],
              [
                1141.017,
                1101.482
              ],
              [
                1140.209,
                1102.232
              ],
              [
                1139.429,
                1103.012
              ],
              [
                1138.678,
                1103.821
              ],
              [
                1137.959,
                1104.656
              ],
              [
                1137.27,
                1105.518
              ],
              [
                1136.614,
                1106.405
              ],
              [
                1135.991,
                1107.315
              ],
              [
                1135.403,
                1108.248
              ],
              [
                1134.849,
                1109.201
              ],
              [
                1134.332,
                1110.175
              ],
              [
                1133.85,
                1111.167
              ],
              [
                1133.406,
                1112.177
              ],
              [
                1132.999,
                1113.202
              ],
              [
                1132.631,
                1114.242
              ],
              [
                1132.301,
                1115.294
              ],
              [
                1132.011,
                1116.358
              ],
              [
                1131.76,
                1117.432
              ]
            ]
          },
          {
            "id": "middle-bottom:wpbsa-param:drop-judge",
            "name": "middle-bottom drop judge",
            "areaId": "middle-bottom",
            "boundaryType": "dropJudge",
            "boundaryTypeName": "\u843D\u888B\u5224\u5B9A\u533A",
            "tool": "parametricPolyline",
            "toolName": "\u53C2\u6570\u5316\u591A\u6BB5\u7EBF",
            "source": "wpbsa-2005-6-parametric-candidate",
            "outputPointCount": 20,
            "polylineTableMm": [
              [
                -50.338,
                921.703
              ],
              [
                -47.355,
                915.657
              ],
              [
                -43.65,
                910.025
              ],
              [
                -39.279,
                904.894
              ],
              [
                -34.308,
                900.34
              ],
              [
                -28.814,
                896.434
              ],
              [
                -22.88,
                893.235
              ],
              [
                -16.597,
                890.792
              ],
              [
                -10.06,
                889.142
              ],
              [
                -3.371,
                888.311
              ],
              [
                3.371,
                888.311
              ],
              [
                10.06,
                889.142
              ],
              [
                16.597,
                890.792
              ],
              [
                22.88,
                893.235
              ],
              [
                28.814,
                896.434
              ],
              [
                34.308,
                900.34
              ],
              [
                39.279,
                904.894
              ],
              [
                43.65,
                910.025
              ],
              [
                47.355,
                915.657
              ],
              [
                50.338,
                921.703
              ]
            ],
            "polylineImagePx": [
              [
                1080.54,
                1108.154
              ],
              [
                1082.168,
                1104.858
              ],
              [
                1084.189,
                1101.786
              ],
              [
                1086.573,
                1098.988
              ],
              [
                1089.285,
                1096.504
              ],
              [
                1092.282,
                1094.374
              ],
              [
                1095.519,
                1092.63
              ],
              [
                1098.946,
                1091.297
              ],
              [
                1102.512,
                1090.398
              ],
              [
                1106.161,
                1089.944
              ],
              [
                1109.839,
                1089.944
              ],
              [
                1113.488,
                1090.398
              ],
              [
                1117.054,
                1091.297
              ],
              [
                1120.481,
                1092.63
              ],
              [
                1123.718,
                1094.374
              ],
              [
                1126.715,
                1096.504
              ],
              [
                1129.427,
                1098.988
              ],
              [
                1131.811,
                1101.786
              ],
              [
                1133.832,
                1104.858
              ],
              [
                1135.46,
                1108.154
              ]
            ]
          },
          {
            "id": "corner-top-right:wpbsa-param:left-pocket-rail",
            "name": "corner-top-right mirrored pocket rail",
            "areaId": "corner-top-right",
            "boundaryType": "pocketRail",
            "boundaryTypeName": "\u888B\u53E3\u5E93\u8FB9\u533A",
            "tool": "parametricPolyline",
            "toolName": "\u53C2\u6570\u5316\u591A\u6BB5\u7EBF",
            "source": "wpbsa-2005-6-parametric-candidate",
            "outputPointCount": 40,
            "polylineTableMm": [
              [
                1786.491,
                -800.067
              ],
              [
                1786.517,
                -802.058
              ],
              [
                1786.596,
                -804.048
              ],
              [
                1786.726,
                -806.035
              ],
              [
                1786.909,
                -808.017
              ],
              [
                1787.144,
                -809.995
              ],
              [
                1787.431,
                -811.965
              ],
              [
                1787.769,
                -813.927
              ],
              [
                1788.159,
                -815.88
              ],
              [
                1788.6,
                -817.822
              ],
              [
                1789.092,
                -819.751
              ],
              [
                1789.635,
                -821.667
              ],
              [
                1790.227,
                -823.568
              ],
              [
                1790.87,
                -825.453
              ],
              [
                1791.562,
                -827.32
              ],
              [
                1792.302,
                -829.168
              ],
              [
                1793.091,
                -830.997
              ],
              [
                1793.928,
                -832.803
              ],
              [
                1794.811,
                -834.588
              ],
              [
                1795.742,
                -836.348
              ],
              [
                1796.652,
                -837.801
              ],
              [
                1797.505,
                -839.284
              ],
              [
                1798.38,
                -840.754
              ],
              [
                1799.278,
                -842.211
              ],
              [
                1800.197,
                -843.654
              ],
              [
                1801.138,
                -845.083
              ],
              [
                1802.1,
                -846.498
              ],
              [
                1803.083,
                -847.898
              ],
              [
                1804.087,
                -849.284
              ],
              [
                1805.112,
                -850.654
              ],
              [
                1806.158,
                -852.008
              ],
              [
                1807.224,
                -853.347
              ],
              [
                1808.31,
                -854.669
              ],
              [
                1809.415,
                -855.975
              ],
              [
                1810.54,
                -857.264
              ],
              [
                1811.685,
                -858.536
              ],
              [
                1812.848,
                -859.79
              ],
              [
                1814.031,
                -861.027
              ],
              [
                1815.231,
                -862.246
              ],
              [
                1833.844,
                -880.859
              ]
            ],
            "polylineImagePx": [
              [
                2082.533,
                169.18
              ],
              [
                2082.547,
                168.094
              ],
              [
                2082.59,
                167.009
              ],
              [
                2082.661,
                165.926
              ],
              [
                2082.761,
                164.844
              ],
              [
                2082.889,
                163.766
              ],
              [
                2083.046,
                162.691
              ],
              [
                2083.23,
                161.621
              ],
              [
                2083.443,
                160.556
              ],
              [
                2083.684,
                159.497
              ],
              [
                2083.952,
                158.445
              ],
              [
                2084.248,
                157.4
              ],
              [
                2084.571,
                156.364
              ],
              [
                2084.922,
                155.336
              ],
              [
                2085.299,
                154.318
              ],
              [
                2085.703,
                153.31
              ],
              [
                2086.133,
                152.313
              ],
              [
                2086.59,
                151.327
              ],
              [
                2087.072,
                150.354
              ],
              [
                2087.579,
                149.394
              ],
              [
                2088.076,
                148.602
              ],
              [
                2088.541,
                147.793
              ],
              [
                2089.019,
                146.991
              ],
              [
                2089.508,
                146.197
              ],
              [
                2090.009,
                145.41
              ],
              [
                2090.523,
                144.63
              ],
              [
                2091.048,
                143.859
              ],
              [
                2091.584,
                143.095
              ],
              [
                2092.132,
                142.34
              ],
              [
                2092.691,
                141.592
              ],
              [
                2093.261,
                140.854
              ],
              [
                2093.843,
                140.124
              ],
              [
                2094.435,
                139.403
              ],
              [
                2095.038,
                138.691
              ],
              [
                2095.652,
                137.988
              ],
              [
                2096.276,
                137.294
              ],
              [
                2096.911,
                136.61
              ],
              [
                2097.556,
                135.935
              ],
              [
                2098.211,
                135.27
              ],
              [
                2108.364,
                125.12
              ]
            ]
          },
          {
            "id": "corner-top-right:wpbsa-param:right-pocket-rail",
            "name": "corner-top-right pocket rail",
            "areaId": "corner-top-right",
            "boundaryType": "pocketRail",
            "boundaryTypeName": "\u888B\u53E3\u5E93\u8FB9\u533A",
            "tool": "parametricPolyline",
            "toolName": "\u53C2\u6570\u5316\u591A\u6BB5\u7EBF",
            "source": "wpbsa-2005-6-parametric-candidate",
            "outputPointCount": 40,
            "polylineTableMm": [
              [
                1696.706,
                -889.849
              ],
              [
                1698.697,
                -889.875
              ],
              [
                1700.687,
                -889.954
              ],
              [
                1702.674,
                -890.084
              ],
              [
                1704.656,
                -890.267
              ],
              [
                1706.634,
                -890.502
              ],
              [
                1708.604,
                -890.789
              ],
              [
                1710.566,
                -891.128
              ],
              [
                1712.519,
                -891.518
              ],
              [
                1714.461,
                -891.959
              ],
              [
                1716.39,
                -892.451
              ],
              [
                1718.306,
                -892.994
              ],
              [
                1720.207,
                -893.586
              ],
              [
                1722.092,
                -894.229
              ],
              [
                1723.959,
                -894.92
              ],
              [
                1725.807,
                -895.661
              ],
              [
                1727.635,
                -896.45
              ],
              [
                1729.442,
                -897.287
              ],
              [
                1731.226,
                -898.171
              ],
              [
                1732.987,
                -899.101
              ],
              [
                1734.439,
                -900.011
              ],
              [
                1735.922,
                -900.864
              ],
              [
                1737.393,
                -901.74
              ],
              [
                1738.85,
                -902.637
              ],
              [
                1740.293,
                -903.556
              ],
              [
                1741.722,
                -904.497
              ],
              [
                1743.137,
                -905.459
              ],
              [
                1744.537,
                -906.443
              ],
              [
                1745.922,
                -907.447
              ],
              [
                1747.292,
                -908.472
              ],
              [
                1748.646,
                -909.518
              ],
              [
                1749.985,
                -910.584
              ],
              [
                1751.307,
                -911.669
              ],
              [
                1752.613,
                -912.775
              ],
              [
                1753.902,
                -913.9
              ],
              [
                1755.174,
                -915.045
              ],
              [
                1756.428,
                -916.208
              ],
              [
                1757.665,
                -917.391
              ],
              [
                1758.884,
                -918.591
              ],
              [
                1777.497,
                -937.205
              ]
            ],
            "polylineImagePx": [
              [
                2033.555,
                120.217
              ],
              [
                2034.641,
                120.203
              ],
              [
                2035.727,
                120.16
              ],
              [
                2036.81,
                120.089
              ],
              [
                2037.892,
                119.989
              ],
              [
                2038.971,
                119.861
              ],
              [
                2040.046,
                119.704
              ],
              [
                2041.116,
                119.52
              ],
              [
                2042.181,
                119.307
              ],
              [
                2043.24,
                119.066
              ],
              [
                2044.293,
                118.798
              ],
              [
                2045.338,
                118.502
              ],
              [
                2046.375,
                118.179
              ],
              [
                2047.403,
                117.829
              ],
              [
                2048.422,
                117.451
              ],
              [
                2049.43,
                117.047
              ],
              [
                2050.427,
                116.617
              ],
              [
                2051.413,
                116.161
              ],
              [
                2052.386,
                115.679
              ],
              [
                2053.346,
                115.171
              ],
              [
                2054.139,
                114.675
              ],
              [
                2054.948,
                114.21
              ],
              [
                2055.75,
                113.732
              ],
              [
                2056.544,
                113.243
              ],
              [
                2057.332,
                112.742
              ],
              [
                2058.111,
                112.229
              ],
              [
                2058.883,
                111.704
              ],
              [
                2059.647,
                111.168
              ],
              [
                2060.403,
                110.62
              ],
              [
                2061.15,
                110.061
              ],
              [
                2061.889,
                109.491
              ],
              [
                2062.619,
                108.909
              ],
              [
                2063.34,
                108.317
              ],
              [
                2064.052,
                107.714
              ],
              [
                2064.756,
                107.101
              ],
              [
                2065.449,
                106.476
              ],
              [
                2066.134,
                105.842
              ],
              [
                2066.808,
                105.197
              ],
              [
                2067.473,
                104.542
              ],
              [
                2077.627,
                94.392
              ]
            ]
          },
          {
            "id": "corner-top-right:wpbsa-param:drop-judge",
            "name": "corner-top-right drop judge",
            "areaId": "corner-top-right",
            "boundaryType": "dropJudge",
            "boundaryTypeName": "\u843D\u888B\u5224\u5B9A\u533A",
            "tool": "parametricPolyline",
            "toolName": "\u53C2\u6570\u5316\u591A\u6BB5\u7EBF",
            "source": "wpbsa-2005-6-parametric-candidate",
            "outputPointCount": 20,
            "polylineTableMm": [
              [
                1749.641,
                -910.306
              ],
              [
                1751.094,
                -906.121
              ],
              [
                1752.756,
                -902.014
              ],
              [
                1754.621,
                -897.995
              ],
              [
                1756.685,
                -894.075
              ],
              [
                1758.943,
                -890.263
              ],
              [
                1761.389,
                -886.569
              ],
              [
                1764.017,
                -883.002
              ],
              [
                1766.821,
                -879.572
              ],
              [
                1769.793,
                -876.286
              ],
              [
                1772.926,
                -873.153
              ],
              [
                1776.212,
                -870.182
              ],
              [
                1779.642,
                -867.378
              ],
              [
                1783.209,
                -864.75
              ],
              [
                1786.903,
                -862.304
              ],
              [
                1790.715,
                -860.046
              ],
              [
                1794.635,
                -857.982
              ],
              [
                1798.654,
                -856.117
              ],
              [
                1802.761,
                -854.456
              ],
              [
                1806.946,
                -853.002
              ]
            ],
            "polylineImagePx": [
              [
                2062.431,
                109.061
              ],
              [
                2063.224,
                111.343
              ],
              [
                2064.13,
                113.583
              ],
              [
                2065.148,
                115.775
              ],
              [
                2066.274,
                117.912
              ],
              [
                2067.505,
                119.991
              ],
              [
                2068.84,
                122.006
              ],
              [
                2070.274,
                123.951
              ],
              [
                2071.803,
                125.822
              ],
              [
                2073.424,
                127.614
              ],
              [
                2075.133,
                129.322
              ],
              [
                2076.926,
                130.943
              ],
              [
                2078.797,
                132.472
              ],
              [
                2080.743,
                133.905
              ],
              [
                2082.758,
                135.239
              ],
              [
                2084.837,
                136.47
              ],
              [
                2086.976,
                137.596
              ],
              [
                2089.168,
                138.613
              ],
              [
                2091.408,
                139.519
              ],
              [
                2093.691,
                140.312
              ]
            ]
          },
          {
            "id": "corner-bottom-right:wpbsa-param:left-pocket-rail",
            "name": "corner-bottom-right mirrored pocket rail",
            "areaId": "corner-bottom-right",
            "boundaryType": "pocketRail",
            "boundaryTypeName": "\u888B\u53E3\u5E93\u8FB9\u533A",
            "tool": "parametricPolyline",
            "toolName": "\u53C2\u6570\u5316\u591A\u6BB5\u7EBF",
            "source": "wpbsa-2005-6-parametric-candidate",
            "outputPointCount": 40,
            "polylineTableMm": [
              [
                1786.491,
                800.067
              ],
              [
                1786.517,
                802.058
              ],
              [
                1786.596,
                804.048
              ],
              [
                1786.726,
                806.035
              ],
              [
                1786.909,
                808.017
              ],
              [
                1787.144,
                809.995
              ],
              [
                1787.431,
                811.965
              ],
              [
                1787.769,
                813.927
              ],
              [
                1788.159,
                815.88
              ],
              [
                1788.6,
                817.822
              ],
              [
                1789.092,
                819.751
              ],
              [
                1789.635,
                821.667
              ],
              [
                1790.227,
                823.568
              ],
              [
                1790.87,
                825.453
              ],
              [
                1791.562,
                827.32
              ],
              [
                1792.302,
                829.168
              ],
              [
                1793.091,
                830.997
              ],
              [
                1793.928,
                832.803
              ],
              [
                1794.811,
                834.588
              ],
              [
                1795.742,
                836.348
              ],
              [
                1796.652,
                837.801
              ],
              [
                1797.505,
                839.284
              ],
              [
                1798.38,
                840.754
              ],
              [
                1799.278,
                842.211
              ],
              [
                1800.197,
                843.654
              ],
              [
                1801.138,
                845.083
              ],
              [
                1802.1,
                846.498
              ],
              [
                1803.083,
                847.898
              ],
              [
                1804.087,
                849.284
              ],
              [
                1805.112,
                850.654
              ],
              [
                1806.158,
                852.008
              ],
              [
                1807.224,
                853.347
              ],
              [
                1808.31,
                854.669
              ],
              [
                1809.415,
                855.975
              ],
              [
                1810.54,
                857.264
              ],
              [
                1811.685,
                858.536
              ],
              [
                1812.848,
                859.79
              ],
              [
                1814.031,
                861.027
              ],
              [
                1815.231,
                862.246
              ],
              [
                1833.844,
                880.859
              ]
            ],
            "polylineImagePx": [
              [
                2082.533,
                1041.82
              ],
              [
                2082.547,
                1042.906
              ],
              [
                2082.59,
                1043.991
              ],
              [
                2082.661,
                1045.074
              ],
              [
                2082.761,
                1046.156
              ],
              [
                2082.889,
                1047.234
              ],
              [
                2083.046,
                1048.309
              ],
              [
                2083.23,
                1049.379
              ],
              [
                2083.443,
                1050.444
              ],
              [
                2083.684,
                1051.503
              ],
              [
                2083.952,
                1052.555
              ],
              [
                2084.248,
                1053.6
              ],
              [
                2084.571,
                1054.636
              ],
              [
                2084.922,
                1055.664
              ],
              [
                2085.299,
                1056.682
              ],
              [
                2085.703,
                1057.69
              ],
              [
                2086.133,
                1058.688
              ],
              [
                2086.59,
                1059.673
              ],
              [
                2087.072,
                1060.646
              ],
              [
                2087.579,
                1061.606
              ],
              [
                2088.076,
                1062.398
              ],
              [
                2088.541,
                1063.207
              ],
              [
                2089.019,
                1064.009
              ],
              [
                2089.508,
                1064.803
              ],
              [
                2090.009,
                1065.59
              ],
              [
                2090.523,
                1066.37
              ],
              [
                2091.048,
                1067.141
              ],
              [
                2091.584,
                1067.905
              ],
              [
                2092.132,
                1068.661
              ],
              [
                2092.691,
                1069.408
              ],
              [
                2093.261,
                1070.146
              ],
              [
                2093.843,
                1070.876
              ],
              [
                2094.435,
                1071.597
              ],
              [
                2095.038,
                1072.31
              ],
              [
                2095.652,
                1073.012
              ],
              [
                2096.276,
                1073.706
              ],
              [
                2096.911,
                1074.39
              ],
              [
                2097.556,
                1075.065
              ],
              [
                2098.211,
                1075.73
              ],
              [
                2108.364,
                1085.88
              ]
            ]
          },
          {
            "id": "corner-bottom-right:wpbsa-param:right-pocket-rail",
            "name": "corner-bottom-right pocket rail",
            "areaId": "corner-bottom-right",
            "boundaryType": "pocketRail",
            "boundaryTypeName": "\u888B\u53E3\u5E93\u8FB9\u533A",
            "tool": "parametricPolyline",
            "toolName": "\u53C2\u6570\u5316\u591A\u6BB5\u7EBF",
            "source": "wpbsa-2005-6-parametric-candidate",
            "outputPointCount": 40,
            "polylineTableMm": [
              [
                1696.706,
                889.849
              ],
              [
                1698.697,
                889.875
              ],
              [
                1700.687,
                889.954
              ],
              [
                1702.674,
                890.084
              ],
              [
                1704.656,
                890.267
              ],
              [
                1706.634,
                890.502
              ],
              [
                1708.604,
                890.789
              ],
              [
                1710.566,
                891.128
              ],
              [
                1712.519,
                891.518
              ],
              [
                1714.461,
                891.959
              ],
              [
                1716.39,
                892.451
              ],
              [
                1718.306,
                892.994
              ],
              [
                1720.207,
                893.586
              ],
              [
                1722.092,
                894.229
              ],
              [
                1723.959,
                894.92
              ],
              [
                1725.807,
                895.661
              ],
              [
                1727.635,
                896.45
              ],
              [
                1729.442,
                897.287
              ],
              [
                1731.226,
                898.171
              ],
              [
                1732.987,
                899.101
              ],
              [
                1734.439,
                900.011
              ],
              [
                1735.922,
                900.864
              ],
              [
                1737.393,
                901.74
              ],
              [
                1738.85,
                902.637
              ],
              [
                1740.293,
                903.556
              ],
              [
                1741.722,
                904.497
              ],
              [
                1743.137,
                905.459
              ],
              [
                1744.537,
                906.443
              ],
              [
                1745.922,
                907.447
              ],
              [
                1747.292,
                908.472
              ],
              [
                1748.646,
                909.518
              ],
              [
                1749.985,
                910.584
              ],
              [
                1751.307,
                911.669
              ],
              [
                1752.613,
                912.775
              ],
              [
                1753.902,
                913.9
              ],
              [
                1755.174,
                915.045
              ],
              [
                1756.428,
                916.208
              ],
              [
                1757.665,
                917.391
              ],
              [
                1758.884,
                918.591
              ],
              [
                1777.497,
                937.205
              ]
            ],
            "polylineImagePx": [
              [
                2033.555,
                1090.783
              ],
              [
                2034.641,
                1090.797
              ],
              [
                2035.727,
                1090.84
              ],
              [
                2036.81,
                1090.911
              ],
              [
                2037.892,
                1091.011
              ],
              [
                2038.971,
                1091.139
              ],
              [
                2040.046,
                1091.296
              ],
              [
                2041.116,
                1091.48
              ],
              [
                2042.181,
                1091.693
              ],
              [
                2043.24,
                1091.934
              ],
              [
                2044.293,
                1092.202
              ],
              [
                2045.338,
                1092.498
              ],
              [
                2046.375,
                1092.821
              ],
              [
                2047.403,
                1093.171
              ],
              [
                2048.422,
                1093.549
              ],
              [
                2049.43,
                1093.953
              ],
              [
                2050.427,
                1094.383
              ],
              [
                2051.413,
                1094.839
              ],
              [
                2052.386,
                1095.321
              ],
              [
                2053.346,
                1095.829
              ],
              [
                2054.139,
                1096.325
              ],
              [
                2054.948,
                1096.79
              ],
              [
                2055.75,
                1097.268
              ],
              [
                2056.544,
                1097.757
              ],
              [
                2057.332,
                1098.258
              ],
              [
                2058.111,
                1098.771
              ],
              [
                2058.883,
                1099.296
              ],
              [
                2059.647,
                1099.832
              ],
              [
                2060.403,
                1100.38
              ],
              [
                2061.15,
                1100.939
              ],
              [
                2061.889,
                1101.509
              ],
              [
                2062.619,
                1102.091
              ],
              [
                2063.34,
                1102.683
              ],
              [
                2064.052,
                1103.286
              ],
              [
                2064.756,
                1103.899
              ],
              [
                2065.449,
                1104.524
              ],
              [
                2066.134,
                1105.158
              ],
              [
                2066.808,
                1105.803
              ],
              [
                2067.473,
                1106.458
              ],
              [
                2077.627,
                1116.609
              ]
            ]
          },
          {
            "id": "corner-bottom-right:wpbsa-param:drop-judge",
            "name": "corner-bottom-right drop judge",
            "areaId": "corner-bottom-right",
            "boundaryType": "dropJudge",
            "boundaryTypeName": "\u843D\u888B\u5224\u5B9A\u533A",
            "tool": "parametricPolyline",
            "toolName": "\u53C2\u6570\u5316\u591A\u6BB5\u7EBF",
            "source": "wpbsa-2005-6-parametric-candidate",
            "outputPointCount": 20,
            "polylineTableMm": [
              [
                1749.641,
                910.306
              ],
              [
                1751.094,
                906.121
              ],
              [
                1752.756,
                902.014
              ],
              [
                1754.621,
                897.995
              ],
              [
                1756.685,
                894.075
              ],
              [
                1758.943,
                890.263
              ],
              [
                1761.389,
                886.569
              ],
              [
                1764.017,
                883.002
              ],
              [
                1766.821,
                879.572
              ],
              [
                1769.793,
                876.286
              ],
              [
                1772.926,
                873.153
              ],
              [
                1776.212,
                870.182
              ],
              [
                1779.642,
                867.378
              ],
              [
                1783.209,
                864.75
              ],
              [
                1786.903,
                862.304
              ],
              [
                1790.715,
                860.046
              ],
              [
                1794.635,
                857.982
              ],
              [
                1798.654,
                856.117
              ],
              [
                1802.761,
                854.456
              ],
              [
                1806.946,
                853.002
              ]
            ],
            "polylineImagePx": [
              [
                2062.431,
                1101.939
              ],
              [
                2063.224,
                1099.657
              ],
              [
                2064.13,
                1097.417
              ],
              [
                2065.148,
                1095.226
              ],
              [
                2066.274,
                1093.088
              ],
              [
                2067.505,
                1091.009
              ],
              [
                2068.84,
                1088.994
              ],
              [
                2070.274,
                1087.049
              ],
              [
                2071.803,
                1085.178
              ],
              [
                2073.424,
                1083.386
              ],
              [
                2075.133,
                1081.678
              ],
              [
                2076.926,
                1080.057
              ],
              [
                2078.797,
                1078.528
              ],
              [
                2080.743,
                1077.095
              ],
              [
                2082.758,
                1075.761
              ],
              [
                2084.837,
                1074.53
              ],
              [
                2086.976,
                1073.404
              ],
              [
                2089.168,
                1072.387
              ],
              [
                2091.408,
                1071.481
              ],
              [
                2093.691,
                1070.689
              ]
            ]
          },
          {
            "id": "corner-bottom-left:wpbsa-param:left-pocket-rail",
            "name": "corner-bottom-left mirrored pocket rail",
            "areaId": "corner-bottom-left",
            "boundaryType": "pocketRail",
            "boundaryTypeName": "\u888B\u53E3\u5E93\u8FB9\u533A",
            "tool": "parametricPolyline",
            "toolName": "\u53C2\u6570\u5316\u591A\u6BB5\u7EBF",
            "source": "wpbsa-2005-6-parametric-candidate",
            "outputPointCount": 40,
            "polylineTableMm": [
              [
                -1786.491,
                800.067
              ],
              [
                -1786.517,
                802.058
              ],
              [
                -1786.596,
                804.048
              ],
              [
                -1786.726,
                806.035
              ],
              [
                -1786.909,
                808.017
              ],
              [
                -1787.144,
                809.995
              ],
              [
                -1787.431,
                811.965
              ],
              [
                -1787.769,
                813.927
              ],
              [
                -1788.159,
                815.88
              ],
              [
                -1788.6,
                817.822
              ],
              [
                -1789.092,
                819.751
              ],
              [
                -1789.635,
                821.667
              ],
              [
                -1790.227,
                823.568
              ],
              [
                -1790.87,
                825.453
              ],
              [
                -1791.562,
                827.32
              ],
              [
                -1792.302,
                829.168
              ],
              [
                -1793.091,
                830.997
              ],
              [
                -1793.928,
                832.803
              ],
              [
                -1794.811,
                834.588
              ],
              [
                -1795.742,
                836.348
              ],
              [
                -1796.652,
                837.801
              ],
              [
                -1797.505,
                839.284
              ],
              [
                -1798.38,
                840.754
              ],
              [
                -1799.278,
                842.211
              ],
              [
                -1800.197,
                843.654
              ],
              [
                -1801.138,
                845.083
              ],
              [
                -1802.1,
                846.498
              ],
              [
                -1803.083,
                847.898
              ],
              [
                -1804.087,
                849.284
              ],
              [
                -1805.112,
                850.654
              ],
              [
                -1806.158,
                852.008
              ],
              [
                -1807.224,
                853.347
              ],
              [
                -1808.31,
                854.669
              ],
              [
                -1809.415,
                855.975
              ],
              [
                -1810.54,
                857.264
              ],
              [
                -1811.685,
                858.536
              ],
              [
                -1812.848,
                859.79
              ],
              [
                -1814.031,
                861.027
              ],
              [
                -1815.231,
                862.246
              ],
              [
                -1833.844,
                880.859
              ]
            ],
            "polylineImagePx": [
              [
                133.467,
                1041.82
              ],
              [
                133.453,
                1042.906
              ],
              [
                133.41,
                1043.991
              ],
              [
                133.339,
                1045.074
              ],
              [
                133.239,
                1046.156
              ],
              [
                133.111,
                1047.234
              ],
              [
                132.954,
                1048.309
              ],
              [
                132.77,
                1049.379
              ],
              [
                132.557,
                1050.444
              ],
              [
                132.316,
                1051.503
              ],
              [
                132.048,
                1052.555
              ],
              [
                131.752,
                1053.6
              ],
              [
                131.429,
                1054.636
              ],
              [
                131.078,
                1055.664
              ],
              [
                130.701,
                1056.682
              ],
              [
                130.297,
                1057.69
              ],
              [
                129.867,
                1058.688
              ],
              [
                129.41,
                1059.673
              ],
              [
                128.928,
                1060.646
              ],
              [
                128.421,
                1061.606
              ],
              [
                127.924,
                1062.398
              ],
              [
                127.459,
                1063.207
              ],
              [
                126.981,
                1064.009
              ],
              [
                126.492,
                1064.803
              ],
              [
                125.99,
                1065.59
              ],
              [
                125.477,
                1066.37
              ],
              [
                124.952,
                1067.141
              ],
              [
                124.416,
                1067.905
              ],
              [
                123.868,
                1068.661
              ],
              [
                123.309,
                1069.408
              ],
              [
                122.739,
                1070.146
              ],
              [
                122.157,
                1070.876
              ],
              [
                121.565,
                1071.597
              ],
              [
                120.962,
                1072.31
              ],
              [
                120.348,
                1073.012
              ],
              [
                119.724,
                1073.706
              ],
              [
                119.089,
                1074.39
              ],
              [
                118.444,
                1075.065
              ],
              [
                117.789,
                1075.73
              ],
              [
                107.636,
                1085.88
              ]
            ]
          },
          {
            "id": "corner-bottom-left:wpbsa-param:right-pocket-rail",
            "name": "corner-bottom-left pocket rail",
            "areaId": "corner-bottom-left",
            "boundaryType": "pocketRail",
            "boundaryTypeName": "\u888B\u53E3\u5E93\u8FB9\u533A",
            "tool": "parametricPolyline",
            "toolName": "\u53C2\u6570\u5316\u591A\u6BB5\u7EBF",
            "source": "wpbsa-2005-6-parametric-candidate",
            "outputPointCount": 40,
            "polylineTableMm": [
              [
                -1696.706,
                889.849
              ],
              [
                -1698.697,
                889.875
              ],
              [
                -1700.687,
                889.954
              ],
              [
                -1702.674,
                890.084
              ],
              [
                -1704.656,
                890.267
              ],
              [
                -1706.634,
                890.502
              ],
              [
                -1708.604,
                890.789
              ],
              [
                -1710.566,
                891.128
              ],
              [
                -1712.519,
                891.518
              ],
              [
                -1714.461,
                891.959
              ],
              [
                -1716.39,
                892.451
              ],
              [
                -1718.306,
                892.994
              ],
              [
                -1720.207,
                893.586
              ],
              [
                -1722.092,
                894.229
              ],
              [
                -1723.959,
                894.92
              ],
              [
                -1725.807,
                895.661
              ],
              [
                -1727.635,
                896.45
              ],
              [
                -1729.442,
                897.287
              ],
              [
                -1731.226,
                898.171
              ],
              [
                -1732.987,
                899.101
              ],
              [
                -1734.439,
                900.011
              ],
              [
                -1735.922,
                900.864
              ],
              [
                -1737.393,
                901.74
              ],
              [
                -1738.85,
                902.637
              ],
              [
                -1740.293,
                903.556
              ],
              [
                -1741.722,
                904.497
              ],
              [
                -1743.137,
                905.459
              ],
              [
                -1744.537,
                906.443
              ],
              [
                -1745.922,
                907.447
              ],
              [
                -1747.292,
                908.472
              ],
              [
                -1748.646,
                909.518
              ],
              [
                -1749.985,
                910.584
              ],
              [
                -1751.307,
                911.669
              ],
              [
                -1752.613,
                912.775
              ],
              [
                -1753.902,
                913.9
              ],
              [
                -1755.174,
                915.045
              ],
              [
                -1756.428,
                916.208
              ],
              [
                -1757.665,
                917.391
              ],
              [
                -1758.884,
                918.591
              ],
              [
                -1777.497,
                937.205
              ]
            ],
            "polylineImagePx": [
              [
                182.445,
                1090.783
              ],
              [
                181.359,
                1090.797
              ],
              [
                180.273,
                1090.84
              ],
              [
                179.19,
                1090.911
              ],
              [
                178.108,
                1091.011
              ],
              [
                177.029,
                1091.139
              ],
              [
                175.954,
                1091.296
              ],
              [
                174.884,
                1091.48
              ],
              [
                173.819,
                1091.693
              ],
              [
                172.76,
                1091.934
              ],
              [
                171.707,
                1092.202
              ],
              [
                170.662,
                1092.498
              ],
              [
                169.625,
                1092.821
              ],
              [
                168.597,
                1093.171
              ],
              [
                167.578,
                1093.549
              ],
              [
                166.57,
                1093.953
              ],
              [
                165.573,
                1094.383
              ],
              [
                164.587,
                1094.839
              ],
              [
                163.614,
                1095.321
              ],
              [
                162.654,
                1095.829
              ],
              [
                161.861,
                1096.325
              ],
              [
                161.052,
                1096.79
              ],
              [
                160.25,
                1097.268
              ],
              [
                159.456,
                1097.757
              ],
              [
                158.668,
                1098.258
              ],
              [
                157.889,
                1098.771
              ],
              [
                157.117,
                1099.296
              ],
              [
                156.353,
                1099.832
              ],
              [
                155.597,
                1100.38
              ],
              [
                154.85,
                1100.939
              ],
              [
                154.111,
                1101.509
              ],
              [
                153.381,
                1102.091
              ],
              [
                152.66,
                1102.683
              ],
              [
                151.948,
                1103.286
              ],
              [
                151.244,
                1103.899
              ],
              [
                150.551,
                1104.524
              ],
              [
                149.866,
                1105.158
              ],
              [
                149.191,
                1105.803
              ],
              [
                148.527,
                1106.458
              ],
              [
                138.373,
                1116.609
              ]
            ]
          },
          {
            "id": "corner-bottom-left:wpbsa-param:drop-judge",
            "name": "corner-bottom-left drop judge",
            "areaId": "corner-bottom-left",
            "boundaryType": "dropJudge",
            "boundaryTypeName": "\u843D\u888B\u5224\u5B9A\u533A",
            "tool": "parametricPolyline",
            "toolName": "\u53C2\u6570\u5316\u591A\u6BB5\u7EBF",
            "source": "wpbsa-2005-6-parametric-candidate",
            "outputPointCount": 20,
            "polylineTableMm": [
              [
                -1749.641,
                910.306
              ],
              [
                -1751.094,
                906.121
              ],
              [
                -1752.756,
                902.014
              ],
              [
                -1754.621,
                897.995
              ],
              [
                -1756.685,
                894.075
              ],
              [
                -1758.943,
                890.263
              ],
              [
                -1761.389,
                886.569
              ],
              [
                -1764.017,
                883.002
              ],
              [
                -1766.821,
                879.572
              ],
              [
                -1769.793,
                876.286
              ],
              [
                -1772.926,
                873.153
              ],
              [
                -1776.212,
                870.182
              ],
              [
                -1779.642,
                867.378
              ],
              [
                -1783.209,
                864.75
              ],
              [
                -1786.903,
                862.304
              ],
              [
                -1790.715,
                860.046
              ],
              [
                -1794.635,
                857.982
              ],
              [
                -1798.654,
                856.117
              ],
              [
                -1802.761,
                854.456
              ],
              [
                -1806.946,
                853.002
              ]
            ],
            "polylineImagePx": [
              [
                153.569,
                1101.939
              ],
              [
                152.776,
                1099.657
              ],
              [
                151.87,
                1097.417
              ],
              [
                150.852,
                1095.226
              ],
              [
                149.726,
                1093.088
              ],
              [
                148.495,
                1091.009
              ],
              [
                147.16,
                1088.994
              ],
              [
                145.726,
                1087.049
              ],
              [
                144.197,
                1085.178
              ],
              [
                142.576,
                1083.386
              ],
              [
                140.867,
                1081.678
              ],
              [
                139.074,
                1080.057
              ],
              [
                137.203,
                1078.528
              ],
              [
                135.257,
                1077.095
              ],
              [
                133.242,
                1075.761
              ],
              [
                131.163,
                1074.53
              ],
              [
                129.024,
                1073.404
              ],
              [
                126.832,
                1072.387
              ],
              [
                124.592,
                1071.481
              ],
              [
                122.309,
                1070.689
              ]
            ]
          },
          {
            "id": "corner-top-left:wpbsa-param:left-pocket-rail",
            "name": "corner-top-left mirrored pocket rail",
            "areaId": "corner-top-left",
            "boundaryType": "pocketRail",
            "boundaryTypeName": "\u888B\u53E3\u5E93\u8FB9\u533A",
            "tool": "parametricPolyline",
            "toolName": "\u53C2\u6570\u5316\u591A\u6BB5\u7EBF",
            "source": "wpbsa-2005-6-parametric-candidate",
            "outputPointCount": 40,
            "polylineTableMm": [
              [
                -1786.491,
                -800.067
              ],
              [
                -1786.517,
                -802.058
              ],
              [
                -1786.596,
                -804.048
              ],
              [
                -1786.726,
                -806.035
              ],
              [
                -1786.909,
                -808.017
              ],
              [
                -1787.144,
                -809.995
              ],
              [
                -1787.431,
                -811.965
              ],
              [
                -1787.769,
                -813.927
              ],
              [
                -1788.159,
                -815.88
              ],
              [
                -1788.6,
                -817.822
              ],
              [
                -1789.092,
                -819.751
              ],
              [
                -1789.635,
                -821.667
              ],
              [
                -1790.227,
                -823.568
              ],
              [
                -1790.87,
                -825.453
              ],
              [
                -1791.562,
                -827.32
              ],
              [
                -1792.302,
                -829.168
              ],
              [
                -1793.091,
                -830.997
              ],
              [
                -1793.928,
                -832.803
              ],
              [
                -1794.811,
                -834.588
              ],
              [
                -1795.742,
                -836.348
              ],
              [
                -1796.652,
                -837.801
              ],
              [
                -1797.505,
                -839.284
              ],
              [
                -1798.38,
                -840.754
              ],
              [
                -1799.278,
                -842.211
              ],
              [
                -1800.197,
                -843.654
              ],
              [
                -1801.138,
                -845.083
              ],
              [
                -1802.1,
                -846.498
              ],
              [
                -1803.083,
                -847.898
              ],
              [
                -1804.087,
                -849.284
              ],
              [
                -1805.112,
                -850.654
              ],
              [
                -1806.158,
                -852.008
              ],
              [
                -1807.224,
                -853.347
              ],
              [
                -1808.31,
                -854.669
              ],
              [
                -1809.415,
                -855.975
              ],
              [
                -1810.54,
                -857.264
              ],
              [
                -1811.685,
                -858.536
              ],
              [
                -1812.848,
                -859.79
              ],
              [
                -1814.031,
                -861.027
              ],
              [
                -1815.231,
                -862.246
              ],
              [
                -1833.844,
                -880.859
              ]
            ],
            "polylineImagePx": [
              [
                133.467,
                169.18
              ],
              [
                133.453,
                168.094
              ],
              [
                133.41,
                167.009
              ],
              [
                133.339,
                165.926
              ],
              [
                133.239,
                164.844
              ],
              [
                133.111,
                163.766
              ],
              [
                132.954,
                162.691
              ],
              [
                132.77,
                161.621
              ],
              [
                132.557,
                160.556
              ],
              [
                132.316,
                159.497
              ],
              [
                132.048,
                158.445
              ],
              [
                131.752,
                157.4
              ],
              [
                131.429,
                156.364
              ],
              [
                131.078,
                155.336
              ],
              [
                130.701,
                154.318
              ],
              [
                130.297,
                153.31
              ],
              [
                129.867,
                152.313
              ],
              [
                129.41,
                151.327
              ],
              [
                128.928,
                150.354
              ],
              [
                128.421,
                149.394
              ],
              [
                127.924,
                148.602
              ],
              [
                127.459,
                147.793
              ],
              [
                126.981,
                146.991
              ],
              [
                126.492,
                146.197
              ],
              [
                125.99,
                145.41
              ],
              [
                125.477,
                144.63
              ],
              [
                124.952,
                143.859
              ],
              [
                124.416,
                143.095
              ],
              [
                123.868,
                142.34
              ],
              [
                123.309,
                141.592
              ],
              [
                122.739,
                140.854
              ],
              [
                122.157,
                140.124
              ],
              [
                121.565,
                139.403
              ],
              [
                120.962,
                138.691
              ],
              [
                120.348,
                137.988
              ],
              [
                119.724,
                137.294
              ],
              [
                119.089,
                136.61
              ],
              [
                118.444,
                135.935
              ],
              [
                117.789,
                135.27
              ],
              [
                107.636,
                125.12
              ]
            ]
          },
          {
            "id": "corner-top-left:wpbsa-param:right-pocket-rail",
            "name": "corner-top-left pocket rail",
            "areaId": "corner-top-left",
            "boundaryType": "pocketRail",
            "boundaryTypeName": "\u888B\u53E3\u5E93\u8FB9\u533A",
            "tool": "parametricPolyline",
            "toolName": "\u53C2\u6570\u5316\u591A\u6BB5\u7EBF",
            "source": "wpbsa-2005-6-parametric-candidate",
            "outputPointCount": 40,
            "polylineTableMm": [
              [
                -1696.706,
                -889.849
              ],
              [
                -1698.697,
                -889.875
              ],
              [
                -1700.687,
                -889.954
              ],
              [
                -1702.674,
                -890.084
              ],
              [
                -1704.656,
                -890.267
              ],
              [
                -1706.634,
                -890.502
              ],
              [
                -1708.604,
                -890.789
              ],
              [
                -1710.566,
                -891.128
              ],
              [
                -1712.519,
                -891.518
              ],
              [
                -1714.461,
                -891.959
              ],
              [
                -1716.39,
                -892.451
              ],
              [
                -1718.306,
                -892.994
              ],
              [
                -1720.207,
                -893.586
              ],
              [
                -1722.092,
                -894.229
              ],
              [
                -1723.959,
                -894.92
              ],
              [
                -1725.807,
                -895.661
              ],
              [
                -1727.635,
                -896.45
              ],
              [
                -1729.442,
                -897.287
              ],
              [
                -1731.226,
                -898.171
              ],
              [
                -1732.987,
                -899.101
              ],
              [
                -1734.439,
                -900.011
              ],
              [
                -1735.922,
                -900.864
              ],
              [
                -1737.393,
                -901.74
              ],
              [
                -1738.85,
                -902.637
              ],
              [
                -1740.293,
                -903.556
              ],
              [
                -1741.722,
                -904.497
              ],
              [
                -1743.137,
                -905.459
              ],
              [
                -1744.537,
                -906.443
              ],
              [
                -1745.922,
                -907.447
              ],
              [
                -1747.292,
                -908.472
              ],
              [
                -1748.646,
                -909.518
              ],
              [
                -1749.985,
                -910.584
              ],
              [
                -1751.307,
                -911.669
              ],
              [
                -1752.613,
                -912.775
              ],
              [
                -1753.902,
                -913.9
              ],
              [
                -1755.174,
                -915.045
              ],
              [
                -1756.428,
                -916.208
              ],
              [
                -1757.665,
                -917.391
              ],
              [
                -1758.884,
                -918.591
              ],
              [
                -1777.497,
                -937.205
              ]
            ],
            "polylineImagePx": [
              [
                182.445,
                120.217
              ],
              [
                181.359,
                120.203
              ],
              [
                180.273,
                120.16
              ],
              [
                179.19,
                120.089
              ],
              [
                178.108,
                119.989
              ],
              [
                177.029,
                119.861
              ],
              [
                175.954,
                119.704
              ],
              [
                174.884,
                119.52
              ],
              [
                173.819,
                119.307
              ],
              [
                172.76,
                119.066
              ],
              [
                171.707,
                118.798
              ],
              [
                170.662,
                118.502
              ],
              [
                169.625,
                118.179
              ],
              [
                168.597,
                117.829
              ],
              [
                167.578,
                117.451
              ],
              [
                166.57,
                117.047
              ],
              [
                165.573,
                116.617
              ],
              [
                164.587,
                116.161
              ],
              [
                163.614,
                115.679
              ],
              [
                162.654,
                115.171
              ],
              [
                161.861,
                114.675
              ],
              [
                161.052,
                114.21
              ],
              [
                160.25,
                113.732
              ],
              [
                159.456,
                113.243
              ],
              [
                158.668,
                112.742
              ],
              [
                157.889,
                112.229
              ],
              [
                157.117,
                111.704
              ],
              [
                156.353,
                111.168
              ],
              [
                155.597,
                110.62
              ],
              [
                154.85,
                110.061
              ],
              [
                154.111,
                109.491
              ],
              [
                153.381,
                108.909
              ],
              [
                152.66,
                108.317
              ],
              [
                151.948,
                107.714
              ],
              [
                151.244,
                107.101
              ],
              [
                150.551,
                106.476
              ],
              [
                149.866,
                105.842
              ],
              [
                149.191,
                105.197
              ],
              [
                148.527,
                104.542
              ],
              [
                138.373,
                94.392
              ]
            ]
          },
          {
            "id": "corner-top-left:wpbsa-param:drop-judge",
            "name": "corner-top-left drop judge",
            "areaId": "corner-top-left",
            "boundaryType": "dropJudge",
            "boundaryTypeName": "\u843D\u888B\u5224\u5B9A\u533A",
            "tool": "parametricPolyline",
            "toolName": "\u53C2\u6570\u5316\u591A\u6BB5\u7EBF",
            "source": "wpbsa-2005-6-parametric-candidate",
            "outputPointCount": 20,
            "polylineTableMm": [
              [
                -1749.641,
                -910.306
              ],
              [
                -1751.094,
                -906.121
              ],
              [
                -1752.756,
                -902.014
              ],
              [
                -1754.621,
                -897.995
              ],
              [
                -1756.685,
                -894.075
              ],
              [
                -1758.943,
                -890.263
              ],
              [
                -1761.389,
                -886.569
              ],
              [
                -1764.017,
                -883.002
              ],
              [
                -1766.821,
                -879.572
              ],
              [
                -1769.793,
                -876.286
              ],
              [
                -1772.926,
                -873.153
              ],
              [
                -1776.212,
                -870.182
              ],
              [
                -1779.642,
                -867.378
              ],
              [
                -1783.209,
                -864.75
              ],
              [
                -1786.903,
                -862.304
              ],
              [
                -1790.715,
                -860.046
              ],
              [
                -1794.635,
                -857.982
              ],
              [
                -1798.654,
                -856.117
              ],
              [
                -1802.761,
                -854.456
              ],
              [
                -1806.946,
                -853.002
              ]
            ],
            "polylineImagePx": [
              [
                153.569,
                109.061
              ],
              [
                152.776,
                111.343
              ],
              [
                151.87,
                113.583
              ],
              [
                150.852,
                115.775
              ],
              [
                149.726,
                117.912
              ],
              [
                148.495,
                119.991
              ],
              [
                147.16,
                122.006
              ],
              [
                145.726,
                123.951
              ],
              [
                144.197,
                125.822
              ],
              [
                142.576,
                127.614
              ],
              [
                140.867,
                129.322
              ],
              [
                139.074,
                130.943
              ],
              [
                137.203,
                132.472
              ],
              [
                135.257,
                133.905
              ],
              [
                133.242,
                135.239
              ],
              [
                131.163,
                136.47
              ],
              [
                129.024,
                137.596
              ],
              [
                126.832,
                138.613
              ],
              [
                124.592,
                139.519
              ],
              [
                122.309,
                140.312
              ]
            ]
          }
        ],
        "baseBoundaryId": "pro-match-84",
        "notes": [
          "Straight rails and black-hole circles are retained from the current hand-drawn boundary.",
          "Pocket rails and drop-judge edges are generated from WPBSA 2005/6 parametric arcs.",
          "Rubber/glue-edge boundary lines are intentionally omitted in this candidate."
        ],
        "parametricMetrics": {
          "arcPointCount": 20,
          "middle": {
            "computed_opening_in": 3.8630333358398308,
            "j_error_in": 0.006320049966819855,
            "k_x_in": 1.6713203375527703
          },
          "corner": {
            "computed_tangent_width_in": 3.3289994994423515,
            "r3_end_angle_deg": 118.61045966596524,
            "r45_start_angle_deg": 118.61045966596524
          }
        }
      };
      module.exports = {
        PRO_MATCH_84_FULL_PHYSICAL_BOUNDARIES: require_calibratePhysicalBoundary().calibratePhysicalBoundary(PRO_MATCH_84_FULL_PHYSICAL_BOUNDARIES)
      };
    }
  });

  // apps/three-game/src/core/model/tableBoundaryPresets.js
  var require_tableBoundaryPresets = __commonJS({
    "apps/three-game/src/core/model/tableBoundaryPresets.js"(exports, module) {
      var { STANDARD_TABLE } = require_standardTableSpec();
      var { PRO_MATCH_84_FULL_PHYSICAL_BOUNDARIES } = require_proMatch84FullPhysicalBoundaries();
      var TABLE_BOUNDARY_PRESET_IDS = {
        PRO_MATCH_84: "pro-match-84"
      };
      var DEFAULT_TABLE_BOUNDARY_PRESET_ID = TABLE_BOUNDARY_PRESET_IDS.PRO_MATCH_84;
      var PRO_MATCH_THROAT_WIDTH_MM = 84;
      var PRO_MATCH_84_BOUNDARY = {
        id: TABLE_BOUNDARY_PRESET_IDS.PRO_MATCH_84,
        name: "\u804C\u4E1A\u8D5B 84mm",
        source: "wpbsa-2005-6-parametric-runtime",
        coordinateSystem: "center-origin-mm",
        playAreaMm: {
          width: STANDARD_TABLE.lengthMm,
          height: STANDARD_TABLE.widthMm
        },
        outerSizeMm: {
          width: 3684.684885,
          height: 1989.532387
        },
        outerBoundsMm: {
          minX: -1842.342442,
          maxX: 1842.342442,
          minY: -994.766193,
          maxY: 994.766193
        },
        playAreaOffsetMm: {
          x: 302.263826,
          y: 227.654699
        },
        straightRailBoundsMm: {
          minX: -STANDARD_TABLE.lengthMm / 2,
          maxX: STANDARD_TABLE.lengthMm / 2,
          minY: -STANDARD_TABLE.widthMm / 2,
          maxY: STANDARD_TABLE.widthMm / 2
        },
        straightRailSizeMm: {
          width: STANDARD_TABLE.lengthMm,
          height: STANDARD_TABLE.widthMm
        },
        throatWidthMm: {
          middle: PRO_MATCH_THROAT_WIDTH_MM,
          corner: PRO_MATCH_THROAT_WIDTH_MM
        },
        mouthWidthMm: {
          middle: 226.424991,
          corner: 126.974133
        },
        rails: [],
        pockets: [
          {
            id: "middle-top",
            type: "middle",
            side: "top",
            center: { x: 0, y: -957.090867 },
            candidateRadius: 202.586199,
            renderRadius: 60.344825,
            captureRadius: 67.241377,
            dropDirection: { x: 0, y: -1 },
            lips: []
          },
          {
            id: "corner-top-right",
            type: "corner",
            side: "top-right",
            center: { x: 1814.830006, y: -918.190443 },
            candidateRadius: 211.206888,
            renderRadius: 63.793101,
            captureRadius: 67.241377,
            dropDirection: { x: 0.707107, y: -0.707107 },
            lips: []
          },
          {
            id: "corner-bottom-right",
            type: "corner",
            side: "bottom-right",
            center: { x: 1814.830006, y: 918.190443 },
            candidateRadius: 211.206888,
            renderRadius: 63.793101,
            captureRadius: 67.241377,
            dropDirection: { x: 0.707107, y: 0.707107 },
            lips: []
          },
          {
            id: "middle-bottom",
            type: "middle",
            side: "bottom",
            center: { x: 0, y: 957.090867 },
            candidateRadius: 202.586199,
            renderRadius: 60.344825,
            captureRadius: 67.241377,
            dropDirection: { x: 0, y: 1 },
            lips: []
          },
          {
            id: "corner-bottom-left",
            type: "corner",
            side: "bottom-left",
            center: { x: -1814.830006, y: 918.190443 },
            candidateRadius: 211.206888,
            renderRadius: 63.793101,
            captureRadius: 67.241377,
            dropDirection: { x: -0.707107, y: 0.707107 },
            lips: []
          },
          {
            id: "corner-top-left",
            type: "corner",
            side: "top-left",
            center: { x: -1814.830006, y: -918.190443 },
            candidateRadius: 211.206888,
            renderRadius: 63.793101,
            captureRadius: 67.241377,
            dropDirection: { x: -0.707107, y: -0.707107 },
            lips: []
          }
        ]
      };
      function clonePoint(point) {
        return { x: point.x, y: point.y };
      }
      function cloneBoundary(boundary) {
        const shift = PRO_MATCH_84_FULL_PHYSICAL_BOUNDARIES.calibration.translationMm;
        return {
          ...boundary,
          playAreaMm: { ...boundary.playAreaMm },
          outerSizeMm: { ...boundary.outerSizeMm },
          outerBoundsMm: { ...boundary.outerBoundsMm },
          playAreaOffsetMm: { ...boundary.playAreaOffsetMm },
          straightRailBoundsMm: { ...boundary.straightRailBoundsMm },
          straightRailSizeMm: { ...boundary.straightRailSizeMm },
          throatWidthMm: { ...boundary.throatWidthMm },
          mouthWidthMm: { ...boundary.mouthWidthMm },
          rails: boundary.rails.map((rail) => ({
            ...rail,
            start: clonePoint(rail.start),
            end: clonePoint(rail.end)
          })),
          pockets: boundary.pockets.map((pocket) => ({
            ...pocket,
            center: {
              x: pocket.center.x + (pocket.type === "middle" ? 0 : Math.sign(pocket.center.x) * shift.x),
              y: pocket.center.y + Math.sign(pocket.center.y) * shift.y
            },
            dropDirection: { ...pocket.dropDirection },
            lips: []
          }))
        };
      }
      function getTableBoundaryPreset() {
        return {
          id: PRO_MATCH_84_BOUNDARY.id,
          name: PRO_MATCH_84_BOUNDARY.name,
          description: "WPBSA \u53C2\u6570\u5316\u804C\u4E1A\u8D5B\u888B\u53E3\u8FB9\u754C\u3002",
          boundary: cloneBoundary(PRO_MATCH_84_BOUNDARY)
        };
      }
      function getTableBoundaryById(id) {
        const boundary = getTableBoundaryPreset().boundary;
        if (typeof TEST_FIELD_V2_BOUNDARY !== "undefined" && id === TEST_FIELD_V2_BOUNDARY.id) {
          boundary.id = id;
        }
        return boundary;
      }
      function listTableBoundaryPresets() {
        const boundary = PRO_MATCH_84_BOUNDARY;
        return [{
          id: boundary.id,
          name: boundary.name,
          description: "WPBSA \u53C2\u6570\u5316\u804C\u4E1A\u8D5B\u888B\u53E3\u8FB9\u754C\u3002",
          throatWidthMm: { ...boundary.throatWidthMm },
          mouthWidthMm: { ...boundary.mouthWidthMm }
        }];
      }
      function measurePocketThroat() {
        return {
          widthMm: PRO_MATCH_THROAT_WIDTH_MM
        };
      }
      module.exports = {
        DEFAULT_TABLE_BOUNDARY_PRESET_ID,
        PRO_MATCH_THROAT_WIDTH_MM,
        TABLE_BOUNDARY_PRESET_IDS,
        getTableBoundaryById,
        getTableBoundaryPreset,
        listTableBoundaryPresets,
        measurePocketThroat
      };
    }
  });

  // apps/three-game/src/core/model/tableModel.js
  var require_tableModel = __commonJS({
    "apps/three-game/src/core/model/tableModel.js"(exports, module) {
      var { getTableBoundaryById } = require_tableBoundaryPresets();
      var { STANDARD_TABLE } = require_standardTableSpec();
      var BOUNDARY = getTableBoundaryById();
      var PLAY_AREA_MM = { width: STANDARD_TABLE.lengthMm, height: STANDARD_TABLE.widthMm };
      var DEFAULT_PLAY_AREA_MM = { ...BOUNDARY.playAreaMm };
      var HALF_PLAY_AREA_MM = {
        width: DEFAULT_PLAY_AREA_MM.width * 0.5,
        height: DEFAULT_PLAY_AREA_MM.height * 0.5
      };
      var RAIL_WIDTH_MM = Math.min(BOUNDARY.playAreaOffsetMm.x, BOUNDARY.playAreaOffsetMm.y);
      var BAULK_LINE_FROM_LEFT_MM = STANDARD_TABLE.baulkFromBottomMm;
      var D_RADIUS_MM = STANDARD_TABLE.dRadiusMm;
      var BLACK_SPOT_FROM_TOP_MM = STANDARD_TABLE.blackFromTopMm;
      var BAULK_LINE_X_MM = -HALF_PLAY_AREA_MM.width + BAULK_LINE_FROM_LEFT_MM;
      var BAULK_LINE_HALF_LENGTH_MM = HALF_PLAY_AREA_MM.height;
      var PINK_SPOT_X_MM = HALF_PLAY_AREA_MM.width * 0.5;
      var BLACK_SPOT_X_MM = HALF_PLAY_AREA_MM.width - BLACK_SPOT_FROM_TOP_MM;
      var TOP_UI_HEIGHT = 94;
      var SCOREBOARD_HEIGHT = 118;
      var RIGHT_CONTROL_WIDTH = 86;
      var TABLE_REFERENCE_TEXTURE_PATH = "assets/images/table/scene_reference_clean.png";
      var REFERENCE_PLAY_RECT = {
        x: 256.5,
        y: 164,
        width: 1405.1,
        height: 700
      };
      function createOuterSizeMm() {
        return {
          ...BOUNDARY.outerSizeMm
        };
      }
      function createTableModel() {
        return {
          physicalModel: "pro-match-84-parametric-boundary",
          rulesPlayAreaMm: { ...PLAY_AREA_MM },
          playAreaMm: { ...DEFAULT_PLAY_AREA_MM },
          halfPlayAreaMm: { ...HALF_PLAY_AREA_MM },
          railWidthMm: RAIL_WIDTH_MM,
          railWidthXMm: BOUNDARY.playAreaOffsetMm.x,
          railWidthYMm: BOUNDARY.playAreaOffsetMm.y,
          playAreaOffsetMm: { ...BOUNDARY.playAreaOffsetMm },
          outerSizeMm: createOuterSizeMm(),
          physicalOuterBoundsMm: { ...BOUNDARY.outerBoundsMm },
          throatWidthMm: { ...BOUNDARY.throatWidthMm },
          mouthWidthMm: { ...BOUNDARY.mouthWidthMm },
          baulkLineMm: BAULK_LINE_X_MM,
          baulkLineFromLeftMm: BAULK_LINE_FROM_LEFT_MM,
          baulkLineHalfLengthMm: BAULK_LINE_HALF_LENGTH_MM,
          dRadiusMm: D_RADIUS_MM,
          pinkSpotMm: PINK_SPOT_X_MM,
          blackSpotFromTopMm: BLACK_SPOT_FROM_TOP_MM,
          blackSpotMm: BLACK_SPOT_X_MM,
          topUiHeight: TOP_UI_HEIGHT,
          scoreboardHeight: SCOREBOARD_HEIGHT,
          rightControlWidth: RIGHT_CONTROL_WIDTH,
          referenceTexturePath: TABLE_REFERENCE_TEXTURE_PATH,
          referencePlayRect: { ...REFERENCE_PLAY_RECT }
        };
      }
      module.exports = {
        PLAY_AREA_MM,
        DEFAULT_PLAY_AREA_MM,
        HALF_PLAY_AREA_MM,
        RAIL_WIDTH_MM,
        BAULK_LINE_FROM_LEFT_MM,
        BAULK_LINE_X_MM,
        BAULK_LINE_HALF_LENGTH_MM,
        D_RADIUS_MM,
        PINK_SPOT_X_MM,
        BLACK_SPOT_FROM_TOP_MM,
        BLACK_SPOT_X_MM,
        TOP_UI_HEIGHT,
        SCOREBOARD_HEIGHT,
        RIGHT_CONTROL_WIDTH,
        TABLE_REFERENCE_TEXTURE_PATH,
        REFERENCE_PLAY_RECT,
        createOuterSizeMm,
        createTableModel
      };
    }
  });

  // apps/three-game/src/core/state/ballState.js
  var require_ballState = __commonJS({
    "apps/three-game/src/core/state/ballState.js"(exports, module) {
      var {
        BALL_COLORS,
        BALL_INERTIA,
        BALL_MASS,
        BALL_RADIUS_MM,
        BALL_VALUES
      } = require_ballSpec();
      function cloneVector2(vector) {
        return { x: vector.x, y: vector.y };
      }
      function createBallState(id, kind, pos, spot = pos) {
        const position = cloneVector2(pos);
        const previousPosition = cloneVector2(pos);
        const velocity = { x: 0, y: 0 };
        const angularVelocity = { x: 0, y: 0, z: 0 };
        return {
          id,
          kind,
          value: BALL_VALUES[kind],
          color: BALL_COLORS[kind],
          radius: BALL_RADIUS_MM,
          mass: BALL_MASS,
          inertia: BALL_INERTIA,
          pos: position,
          position,
          prevPos: previousPosition,
          previousPosition,
          vel: velocity,
          velocity,
          omega: angularVelocity,
          angularVelocity,
          orientation: { x: 0, y: 0, z: 0, w: 1 },
          contactMode: "rolling",
          pocketMode: "table",
          pocketEntry: null,
          spot: cloneVector2(spot),
          potted: false,
          isSliding: false,
          potting: null,
          pocketState: null
        };
      }
      module.exports = {
        createBallState
      };
    }
  });

  // apps/three-game/src/core/model/spotModel.js
  var require_spotModel = __commonJS({
    "apps/three-game/src/core/model/spotModel.js"(exports, module) {
      var { BALL_KIND } = require_constants();
      var { BALL_RADIUS_MM } = require_ballSpec();
      var {
        BAULK_LINE_X_MM,
        BLACK_SPOT_X_MM,
        D_RADIUS_MM,
        PINK_SPOT_X_MM
      } = require_tableModel();
      var CUE_BALL_BROWN_EDGE_CLEARANCE_MM = 20;
      var OPENING_RACK_RED_EDGE_GAP_MM = 0.1;
      function colorSpot(kind) {
        switch (kind) {
          case BALL_KIND.YELLOW:
            return { x: BAULK_LINE_X_MM, y: D_RADIUS_MM };
          case BALL_KIND.GREEN:
            return { x: BAULK_LINE_X_MM, y: -D_RADIUS_MM };
          case BALL_KIND.BROWN:
            return { x: BAULK_LINE_X_MM, y: 0 };
          case BALL_KIND.BLUE:
            return { x: 0, y: 0 };
          case BALL_KIND.PINK:
            return { x: PINK_SPOT_X_MM, y: 0 };
          case BALL_KIND.BLACK:
            return { x: BLACK_SPOT_X_MM, y: 0 };
          default:
            return { x: 0, y: 0 };
        }
      }
      function openingCueBallPosition(options = {}) {
        const baulkLineX = Number.isFinite(Number(options.baulkLineX)) ? Number(options.baulkLineX) : BAULK_LINE_X_MM;
        const ballRadius = Number.isFinite(Number(options.ballRadius)) ? Number(options.ballRadius) : BALL_RADIUS_MM;
        return {
          x: baulkLineX,
          y: ballRadius * 2 + CUE_BALL_BROWN_EDGE_CLEARANCE_MM
        };
      }
      function createOpeningRackLayout() {
        const balls = [];
        let id = 0;
        balls.push({
          id: `ball-${id++}`,
          kind: BALL_KIND.CUE,
          pos: openingCueBallPosition()
        });
        [
          BALL_KIND.YELLOW,
          BALL_KIND.GREEN,
          BALL_KIND.BROWN,
          BALL_KIND.BLUE,
          BALL_KIND.PINK,
          BALL_KIND.BLACK
        ].forEach((kind) => {
          balls.push({
            id: `ball-${id++}`,
            kind,
            pos: colorSpot(kind)
          });
        });
        const apex = { x: PINK_SPOT_X_MM + BALL_RADIUS_MM * 2 + 5, y: 0 };
        const redCenterDistance = BALL_RADIUS_MM * 2 + OPENING_RACK_RED_EDGE_GAP_MM;
        const rowGap = redCenterDistance;
        const colGap = Math.sqrt(3) * redCenterDistance * 0.5;
        for (let row = 0; row < 5; row += 1) {
          for (let col = 0; col <= row; col += 1) {
            balls.push({
              id: `ball-${id++}`,
              kind: BALL_KIND.RED,
              pos: {
                x: apex.x + row * colGap,
                y: (col - row * 0.5) * rowGap
              }
            });
          }
        }
        return balls;
      }
      function createOpeningRack() {
        const { createBallState } = require_ballState();
        return createOpeningRackLayout().map((ball) => createBallState(ball.id, ball.kind, ball.pos, ball.spot || ball.pos));
      }
      module.exports = {
        CUE_BALL_BROWN_EDGE_CLEARANCE_MM,
        OPENING_RACK_RED_EDGE_GAP_MM,
        colorSpot,
        createOpeningRack,
        createOpeningRackLayout,
        openingCueBallPosition
      };
    }
  });

  // apps/three-game/src/core/state/openingRackState.js
  var require_openingRackState = __commonJS({
    "apps/three-game/src/core/state/openingRackState.js"(exports, module) {
      var { createOpeningRackLayout } = require_spotModel();
      var { createBallState } = require_ballState();
      function createOpeningRackState() {
        return createOpeningRackLayout().map((ball) => createBallState(ball.id, ball.kind, ball.pos, ball.spot || ball.pos));
      }
      module.exports = {
        createOpeningRackState
      };
    }
  });

  // apps/three-game/src/core/rules/respot.js
  var require_respot = __commonJS({
    "apps/three-game/src/core/rules/respot.js"(exports, module) {
      var { BALL_KIND, COLOR_ORDER } = require_constants();
      var { BALL_RADIUS_MM } = require_ballSpec();
      var { BAULK_LINE_X_MM, D_RADIUS_MM, HALF_PLAY_AREA_MM } = require_tableModel();
      var { colorSpot, openingCueBallPosition } = require_spotModel();
      function respotColor(state, kind) {
        return { state, kind };
      }
      var COLOR_RESPOT_ORDER = [
        BALL_KIND.BLACK,
        BALL_KIND.PINK,
        BALL_KIND.BLUE,
        BALL_KIND.BROWN,
        BALL_KIND.GREEN,
        BALL_KIND.YELLOW
      ];
      function isColorBallKind(kind) {
        return COLOR_ORDER.includes(kind);
      }
      function tableBaulkLineX(state) {
        return state?.table?.baulkLineMm ?? BAULK_LINE_X_MM;
      }
      function tableDRadius(state) {
        return state?.table?.dRadiusMm ?? D_RADIUS_MM;
      }
      function isInsideDZone(state, pos) {
        const baulkLineX = tableBaulkLineX(state);
        const dRadius = tableDRadius(state);
        return pos.x <= baulkLineX + 1e-3 && Math.hypot(pos.x - baulkLineX, pos.y) <= dRadius + 1e-3;
      }
      function isCuePlacementBlocked(state, pos, cueBall) {
        const cueRadius = cueBall?.radius || BALL_RADIUS_MM;
        return isPositionBlocked(state, pos, {
          ignoreBallId: cueBall?.id,
          radius: cueRadius
        });
      }
      function isPositionBlocked(state, pos, options = {}) {
        const radius = options.radius || BALL_RADIUS_MM;
        const ignoreBallId = options.ignoreBallId || null;
        return (state?.balls || []).some((ball) => {
          if (ball.id === ignoreBallId || ball.potted || !ball.pos) return false;
          const clearance = radius + (ball.radius || BALL_RADIUS_MM) + 0.6;
          return Math.hypot(ball.pos.x - pos.x, ball.pos.y - pos.y) < clearance;
        });
      }
      function tableLimitX(state, ball) {
        const radius = ball?.radius || BALL_RADIUS_MM;
        return (state?.table?.halfPlayAreaMm?.width ?? HALF_PLAY_AREA_MM.width) - radius;
      }
      function tableMinX(state, ball) {
        const radius = ball?.radius || BALL_RADIUS_MM;
        return -((state?.table?.halfPlayAreaMm?.width ?? HALF_PLAY_AREA_MM.width) - radius);
      }
      function isInsidePlayAreaX(state, ball, x) {
        return Number.isFinite(x) && x >= tableMinX(state, ball) && x <= tableLimitX(state, ball);
      }
      function findOpenPointOnSpotLine(state, ball, spot, direction) {
        const radius = ball?.radius || BALL_RADIUS_MM;
        const step = Math.max(1, radius / 10);
        const limit = direction > 0 ? tableLimitX(state, ball) : tableMinX(state, ball);
        let blockedX = spot.x;
        for (let x = spot.x + direction * step; direction > 0 ? x <= limit : x >= limit; x += direction * step) {
          const candidate = { x, y: spot.y };
          if (!isInsidePlayAreaX(state, ball, candidate.x)) break;
          if (!isPositionBlocked(state, candidate, { ignoreBallId: ball.id, radius })) {
            let openX = x;
            for (let i = 0; i < 14; i += 1) {
              const mid = (blockedX + openX) * 0.5;
              const refined = { x: mid, y: spot.y };
              if (!isPositionBlocked(state, refined, { ignoreBallId: ball.id, radius })) {
                openX = mid;
              } else {
                blockedX = mid;
              }
            }
            return { x: openX, y: spot.y };
          }
          blockedX = x;
        }
        return null;
      }
      function findRespottedColorPosition(state, ball) {
        const ownSpot = colorSpot(ball.kind);
        if (!isPositionBlocked(state, ownSpot, {
          ignoreBallId: ball.id,
          radius: ball.radius || BALL_RADIUS_MM
        })) {
          return ownSpot;
        }
        const officialSpot = COLOR_RESPOT_ORDER.map(colorSpot).find((spot) => !isPositionBlocked(state, spot, {
          ignoreBallId: ball.id,
          radius: ball.radius || BALL_RADIUS_MM
        }));
        if (officialSpot) return officialSpot;
        return findOpenPointOnSpotLine(state, ball, ownSpot, 1) || findOpenPointOnSpotLine(state, ball, ownSpot, -1) || ownSpot;
      }
      function defaultCueBallDPosition(state) {
        return openingCueBallPosition({ baulkLineX: tableBaulkLineX(state) });
      }
      function findCueBallDPosition(state, cueBall) {
        const preferred = defaultCueBallDPosition(state);
        if (isInsideDZone(state, preferred) && !isCuePlacementBlocked(state, preferred, cueBall)) {
          return preferred;
        }
        const baulkLineX = tableBaulkLineX(state);
        const dRadius = tableDRadius(state);
        const cueRadius = cueBall?.radius || BALL_RADIUS_MM;
        const radialStep = Math.max(cueRadius * 1.05, dRadius / 5);
        const angleStep = Math.PI / 12;
        for (let radius = radialStep; radius <= dRadius; radius += radialStep) {
          for (let angle = Math.PI; angle >= 0; angle -= angleStep) {
            const candidate = {
              x: baulkLineX - Math.sin(angle) * radius,
              y: Math.cos(angle) * radius
            };
            if (isInsideDZone(state, candidate) && !isCuePlacementBlocked(state, candidate, cueBall)) {
              return candidate;
            }
          }
        }
        return preferred;
      }
      function resetBallToTable(ball, pos) {
        for (const key of Object.keys(ball)) if (/^sp[A-Z]/.test(key)) delete ball[key];
        ball.potted = false;
        ball.potting = null;
        ball.pocketState = null;
        ball.pocketMotion = null;
        ball.pocketEntry = null;
        ball.pocketMode = "table";
        ball.pos = { ...pos };
        ball.position = ball.pos;
        ball.prevPos = { ...pos };
        ball.previousPosition = ball.prevPos;
        ball.vel = { x: 0, y: 0 };
        ball.velocity = ball.vel;
        ball.omega = { x: 0, y: 0, z: 0 };
        ball.angularVelocity = ball.omega;
      }
      function respotPottedCueBallInD(state) {
        const cueBallId = state?.cueBallId;
        const cueBall = state?.balls?.find((ball) => ball.id === cueBallId || ball.kind === BALL_KIND.CUE);
        if (!cueBall || !cueBall.potted) {
          return [];
        }
        const pos = findCueBallDPosition(state, cueBall);
        resetBallToTable(cueBall, pos);
        return [{
          type: "cue-ball-respotted",
          ballId: cueBall.id,
          pos: { ...pos }
        }];
      }
      function respotPottedColorBalls(state, options = {}) {
        const includeKinds = options.includeKinds || null;
        const includeBallIds = options.includeBallIds ? new Set(options.includeBallIds) : null;
        const excludeKinds = options.excludeKinds || [];
        const events = [];
        (state?.balls || []).filter((ball) => ball.potted && isColorBallKind(ball.kind) && (!includeBallIds || includeBallIds.has(ball.id)) && (!includeKinds || includeKinds.includes(ball.kind)) && !excludeKinds.includes(ball.kind)).sort((a, b) => COLOR_ORDER.indexOf(b.kind) - COLOR_ORDER.indexOf(a.kind)).forEach((ball) => {
          const from = {
            potted: Boolean(ball.potted),
            pos: ball.pos ? { ...ball.pos } : null,
            pocketMode: ball.pocketMode || null
          };
          const pos = findRespottedColorPosition(state, ball);
          resetBallToTable(ball, pos);
          events.push({
            type: "color-respotted",
            ballId: ball.id,
            kind: ball.kind,
            from,
            pos: { ...pos }
          });
        });
        return events;
      }
      module.exports = {
        defaultCueBallDPosition,
        findRespottedColorPosition,
        findCueBallDPosition,
        isColorBallKind,
        isInsideDZone,
        isPositionBlocked,
        resetBallToTable,
        respotPottedColorBalls,
        respotPottedCueBallInD,
        respotColor
      };
    }
  });

  // apps/three-game/src/game-client/basicPractice.js
  var require_basicPractice = __commonJS({
    "apps/three-game/src/game-client/basicPractice.js"(exports, module) {
      var { createBallState } = require_ballState();
      var { colorSpot } = require_spotModel();
      var { BAULK_LINE_X_MM, D_RADIUS_MM, HALF_PLAY_AREA_MM, PINK_SPOT_X_MM, BLACK_SPOT_X_MM } = require_tableModel();
      var { BALL_RADIUS_MM } = require_ballSpec();
      var KINDS = { "spot-black": "black", "spot-pink": "pink", "random-long": "red" };
      var isStreak = (id) => Boolean(KINDS[id]);
      var isBasic = (id) => isStreak(id) || id === "spotted-colors";
      var LONG_POT_POCKETS = [-1, 1].map((sign) => ({
        x: HALF_PLAY_AREA_MM.width,
        y: sign * (HALF_PLAY_AREA_MM.height + BALL_RADIUS_MM * 2)
      }));
      var MIN_LONG_POT_DISTANCE_MM = 1800;
      function longPotCutAngle(cue, target, pocket) {
        const dx = pocket.x - target.x, dy = pocket.y - target.y, length = Math.hypot(dx, dy);
        if (!(length > BALL_RADIUS_MM * 2)) return Infinity;
        const gx = target.x - dx / length * BALL_RADIUS_MM * 2;
        const gy = target.y - dy / length * BALL_RADIUS_MM * 2;
        const ix = gx - cue.x, iy = gy - cue.y, incoming = Math.hypot(ix, iy);
        if (!(incoming > 0)) return Infinity;
        return Math.acos(Math.max(-1, Math.min(1, (ix * dx + iy * dy) / (incoming * length)))) * 180 / Math.PI;
      }
      function randomLongTarget(cue, random) {
        for (let attempt = 0; attempt < 64; attempt++) {
          const target = {
            x: PINK_SPOT_X_MM + random() * (BLACK_SPOT_X_MM - PINK_SPOT_X_MM),
            y: (random() * 2 - 1) * (HALF_PLAY_AREA_MM.height - BALL_RADIUS_MM - 1)
          };
          if (Math.hypot(target.x - cue.x, target.y - cue.y) >= MIN_LONG_POT_DISTANCE_MM && LONG_POT_POCKETS.some((pocket) => longPotCutAngle(cue, target, pocket) <= 45)) return target;
        }
        return { x: PINK_SPOT_X_MM, y: (cue.y < 0 ? -1 : 1) * HALF_PLAY_AREA_MM.height * 0.75 };
      }
      function balls(id, random = Math.random) {
        const kind = KINDS[id];
        if (!kind) return null;
        let target, cue;
        if (id === "random-long") {
          const radius = Math.sqrt(random()) * (D_RADIUS_MM - BALL_RADIUS_MM);
          const angle = Math.PI / 2 + random() * Math.PI;
          cue = { x: BAULK_LINE_X_MM + radius * Math.cos(angle), y: radius * Math.sin(angle) };
          target = randomLongTarget(cue, random);
        } else {
          target = colorSpot(kind);
          const angle = Math.atan2(HALF_PLAY_AREA_MM.height - target.y, HALF_PLAY_AREA_MM.width - target.x) + (kind === "black" ? 15 : 5) * Math.PI / 180;
          cue = { x: target.x - 500 * Math.cos(angle), y: target.y - 500 * Math.sin(angle) };
        }
        return [createBallState("cue", "cue", cue), createBallState(kind, kind, target, target)];
      }
      function prepare(state, id) {
        state.frameOver = state.matchOver = false;
        state.currentPlayerId = "p1";
        Object.assign(state.ruleState, { phase: id === "random-long" ? "reds" : "clearance", targetColorKind: KINDS[id], pendingDecision: null, requiresNomination: false, cueBallInHand: false, freeBallAvailable: false });
      }
      function settle(state, id, shot, random = Math.random) {
        const target = state.balls.find((b) => b.kind === KINDS[id]);
        const cue = state.balls.find((b) => b.kind === "cue");
        const success = shot.firstContactBallId === target.id && shot.pottedBallIds?.includes(target.id) && !shot.cueBallPotted && !shot.pottedBallIds.includes(cue.id) && !cue.potted;
        const streak = state.practiceStreak;
        const ended = streak.current;
        if (success) {
          streak.current++;
          streak.best = Math.max(streak.best, streak.current);
        } else streak.current = 0;
        const record = !success && ended > streak.startBest;
        if (!success) streak.startBest = streak.best;
        const fresh = balls(id, random);
        state.balls = fresh.map((b) => {
          const previous = state.balls.find((p) => p.kind === b.kind);
          if (success && id !== "random-long" && b.kind === "cue") return previous;
          b.id = previous.id;
          return b;
        });
        if (success && id !== "random-long") {
          const ball = state.balls.find((b) => b.kind === KINDS[id]);
          const pos = require_respot().findRespottedColorPosition(state, ball);
          ball.pos = { ...pos };
          ball.prevPos = { ...pos };
          ball.position = ball.pos;
          ball.previousPosition = ball.prevPos;
        }
        prepare(state, id);
        state.frameOver = record;
        return { success, record, count: ended };
      }
      function readBest(id, storage) {
        try {
          const value = Number(storage?.getItem("snooker.basic.best." + id));
          return Number.isSafeInteger(value) && value > 0 ? value : 0;
        } catch {
          return 0;
        }
      }
      function saveBest(id, value, storage) {
        try {
          storage?.setItem("snooker.basic.best." + id, String(Math.max(value, readBest(id, storage))));
        } catch {
        }
      }
      module.exports = { MIN_LONG_POT_DISTANCE_MM, longPotCutAngle, KINDS, isBasic, isStreak, balls, prepare, settle, readBest, saveBest };
    }
  });

  // apps/three-game/src/core/model/colliderPrimitives.js
  var require_colliderPrimitives = __commonJS({
    "apps/three-game/src/core/model/colliderPrimitives.js"(exports, module) {
      function clonePoint(point) {
        return { x: point.x, y: point.y };
      }
      function cloneVector(vector) {
        if (!vector) {
          return null;
        }
        return { x: vector.x, y: vector.y };
      }
      function createLineAabb(start, end) {
        return {
          minX: Math.min(start.x, end.x),
          maxX: Math.max(start.x, end.x),
          minY: Math.min(start.y, end.y),
          maxY: Math.max(start.y, end.y)
        };
      }
      function createLineCollider(id, start, end, options = {}) {
        return {
          id,
          type: "line",
          role: options.role || "rail",
          material: options.material || "cushion",
          start: clonePoint(start),
          end: clonePoint(end),
          aabb: createLineAabb(start, end),
          normal: cloneVector(options.normal),
          restitution: options.restitution,
          frictionMu: options.frictionMu
        };
      }
      function createCompositeLineCollider(id, points, options = {}) {
        const clonedPoints = points.map(clonePoint);
        const segments = [];
        for (let i = 0; i < clonedPoints.length - 1; i += 1) {
          segments.push(createLineCollider(
            `${id}:segment-${i}`,
            clonedPoints[i],
            clonedPoints[i + 1],
            {
              role: options.role || "pocket-lip",
              material: options.material || "pocket-lip",
              restitution: options.restitution,
              frictionMu: options.frictionMu
            }
          ));
        }
        return {
          id,
          type: "composite-line",
          role: options.role || "pocket-lip",
          material: options.material || "pocket-lip",
          points: clonedPoints,
          segments
        };
      }
      function createSphereCollider(id, center, radius, options = {}) {
        return {
          id,
          type: "sphere",
          role: options.role || "pocket-capture",
          center: clonePoint(center),
          radius
        };
      }
      module.exports = {
        createLineCollider,
        createCompositeLineCollider,
        createSphereCollider
      };
    }
  });

  // apps/three-game/src/core/model/pocketGeometry.js
  var require_pocketGeometry = __commonJS({
    "apps/three-game/src/core/model/pocketGeometry.js"(exports, module) {
      var { createCompositeLineCollider, createSphereCollider } = require_colliderPrimitives();
      var POCKET_GEOMETRY = {
        middleMouthHalfWidthMm: 113,
        middleCandidateRadiusMm: 235,
        middleCaptureOffsetMm: 68,
        middleCaptureRadiusMm: 66,
        middleRenderRadiusMm: 70,
        cornerRailCutMm: 88,
        cornerCandidateRadiusMm: 245,
        cornerCaptureOffsetMm: 54,
        cornerCaptureRadiusMm: 78,
        cornerRenderRadiusMm: 74
      };
      function signName(value, negativeName, positiveName) {
        return value < 0 ? negativeName : positiveName;
      }
      function createMiddlePocket(table, verticalSign) {
        const half = table.halfPlayAreaMm;
        const side = signName(verticalSign, "top", "bottom");
        const id = `middle-${side}`;
        const y = verticalSign * half.height;
        const mouth = POCKET_GEOMETRY.middleMouthHalfWidthMm;
        const center = { x: 0, y };
        const captureCenter = {
          x: 0,
          y: y + verticalSign * POCKET_GEOMETRY.middleCaptureOffsetMm
        };
        const leftLip = [
          { x: -mouth, y },
          { x: -82, y: y + verticalSign * 4 },
          { x: -48, y: y + verticalSign * 15 },
          { x: -22, y: y + verticalSign * 36 },
          { x: -8, y: y + verticalSign * 58 }
        ];
        const rightLip = leftLip.map((point) => ({ x: -point.x, y: point.y }));
        return {
          id,
          type: "middle",
          side,
          center,
          candidateRadius: POCKET_GEOMETRY.middleCandidateRadiusMm,
          renderRadius: POCKET_GEOMETRY.middleRenderRadiusMm,
          dropDirection: { x: 0, y: verticalSign },
          capture: createSphereCollider(
            `${id}:capture`,
            captureCenter,
            POCKET_GEOMETRY.middleCaptureRadiusMm
          ),
          lips: [
            createCompositeLineCollider(`${id}:left-lip`, leftLip),
            createCompositeLineCollider(`${id}:right-lip`, rightLip)
          ]
        };
      }
      function createCornerPocket(table, horizontalSign, verticalSign) {
        const half = table.halfPlayAreaMm;
        const horizontalName = signName(horizontalSign, "left", "right");
        const verticalName = signName(verticalSign, "top", "bottom");
        const id = `corner-${verticalName}-${horizontalName}`;
        const cut = POCKET_GEOMETRY.cornerRailCutMm;
        const corner = {
          x: horizontalSign * half.width,
          y: verticalSign * half.height
        };
        const captureCenter = {
          x: corner.x + horizontalSign * POCKET_GEOMETRY.cornerCaptureOffsetMm,
          y: corner.y + verticalSign * POCKET_GEOMETRY.cornerCaptureOffsetMm
        };
        const diagonal = Math.SQRT1_2;
        const longRailLip = [
          { x: horizontalSign * (half.width - cut), y: corner.y },
          { x: horizontalSign * (half.width - 54), y: corner.y + verticalSign * 6 },
          { x: horizontalSign * (half.width - 28), y: corner.y + verticalSign * 24 },
          { x: corner.x + horizontalSign * 10, y: corner.y + verticalSign * 50 }
        ];
        const shortRailLip = [
          { x: corner.x, y: verticalSign * (half.height - cut) },
          { x: corner.x + horizontalSign * 6, y: verticalSign * (half.height - 54) },
          { x: corner.x + horizontalSign * 24, y: verticalSign * (half.height - 28) },
          { x: corner.x + horizontalSign * 50, y: corner.y + verticalSign * 10 }
        ];
        return {
          id,
          type: "corner",
          side: `${verticalName}-${horizontalName}`,
          center: corner,
          candidateRadius: POCKET_GEOMETRY.cornerCandidateRadiusMm,
          renderRadius: POCKET_GEOMETRY.cornerRenderRadiusMm,
          dropDirection: {
            x: horizontalSign * diagonal,
            y: verticalSign * diagonal
          },
          capture: createSphereCollider(
            `${id}:capture`,
            captureCenter,
            POCKET_GEOMETRY.cornerCaptureRadiusMm
          ),
          lips: [
            createCompositeLineCollider(`${id}:long-rail-lip`, longRailLip),
            createCompositeLineCollider(`${id}:short-rail-lip`, shortRailLip)
          ]
        };
      }
      function createPocketGeometry(table) {
        return [
          createCornerPocket(table, -1, -1),
          createMiddlePocket(table, -1),
          createCornerPocket(table, 1, -1),
          createCornerPocket(table, -1, 1),
          createMiddlePocket(table, 1),
          createCornerPocket(table, 1, 1)
        ];
      }
      module.exports = {
        POCKET_GEOMETRY,
        createPocketGeometry
      };
    }
  });

  // apps/three-game/src/core/model/railGeometry.js
  var require_railGeometry = __commonJS({
    "apps/three-game/src/core/model/railGeometry.js"(exports, module) {
      var { createLineCollider } = require_colliderPrimitives();
      var { POCKET_GEOMETRY } = require_pocketGeometry();
      function createRailGeometry(table) {
        const half = table.halfPlayAreaMm;
        const middleGap = POCKET_GEOMETRY.middleMouthHalfWidthMm;
        const cornerCut = POCKET_GEOMETRY.cornerRailCutMm;
        return [
          createLineCollider(
            "rail-top-right",
            { x: middleGap, y: -half.height },
            { x: half.width - cornerCut, y: -half.height },
            { normal: { x: 0, y: 1 } }
          ),
          createLineCollider(
            "rail-right",
            { x: half.width, y: -half.height + cornerCut },
            { x: half.width, y: half.height - cornerCut },
            { normal: { x: -1, y: 0 } }
          ),
          createLineCollider(
            "rail-bottom-right",
            { x: half.width - cornerCut, y: half.height },
            { x: middleGap, y: half.height },
            { normal: { x: 0, y: -1 } }
          ),
          createLineCollider(
            "rail-bottom-left",
            { x: -middleGap, y: half.height },
            { x: -half.width + cornerCut, y: half.height },
            { normal: { x: 0, y: -1 } }
          ),
          createLineCollider(
            "rail-left",
            { x: -half.width, y: half.height - cornerCut },
            { x: -half.width, y: -half.height + cornerCut },
            { normal: { x: 1, y: 0 } }
          ),
          createLineCollider(
            "rail-top-left",
            { x: -half.width + cornerCut, y: -half.height },
            { x: -middleGap, y: -half.height },
            { normal: { x: 0, y: 1 } }
          )
        ];
      }
      module.exports = {
        createRailGeometry
      };
    }
  });

  // apps/three-game/src/core/model/pocketBoundaryOverrides.js
  var require_pocketBoundaryOverrides = __commonJS({
    "apps/three-game/src/core/model/pocketBoundaryOverrides.js"(exports, module) {
      var POCKET_BOUNDARY_POINT_DATA = {
        "middle-top": {
          blueRubber: [
            [-41.745, -966.392],
            [-41.337, -968.181],
            [-40.89, -969.929],
            [-40.407, -971.635],
            [-39.887, -973.301],
            [-39.332, -974.925],
            [-38.742, -976.509],
            [-38.119, -978.051],
            [-37.464, -979.552],
            [-36.776, -981.012],
            [-36.058, -982.431],
            [-35.31, -983.808],
            [-34.532, -985.145],
            [-33.727, -986.441],
            [-32.894, -987.695],
            [-32.034, -988.908],
            [-31.149, -990.08],
            [-30.239, -991.211],
            [-29.306, -992.301],
            [-28.349, -993.35],
            [-27.371, -994.358],
            [-26.371, -995.324],
            [-25.351, -996.25],
            [-24.311, -997.134],
            [-23.253, -997.977],
            [-22.177, -998.779],
            [-21.085, -999.54],
            [-19.977, -1000.26],
            [-18.853, -1000.939],
            [-17.716, -1001.577],
            [-16.565, -1002.173],
            [-15.402, -1002.728],
            [-14.227, -1003.243],
            [-13.042, -1003.716],
            [-11.847, -1004.148],
            [-10.644, -1004.539],
            [-9.432, -1004.888],
            [-8.213, -1005.197],
            [-6.988, -1005.464],
            [-5.758, -1005.691],
            [-4.524, -1005.876],
            [-3.285, -1006.02],
            [-2.045, -1006.123],
            [-0.802, -1006.185],
            [0.441, -1006.206],
            [1.685, -1006.186],
            [2.927, -1006.124],
            [4.168, -1006.022],
            [5.406, -1005.878],
            [6.641, -1005.693],
            [7.871, -1005.467],
            [9.096, -1005.2],
            [10.315, -1004.892],
            [11.527, -1004.542],
            [12.731, -1004.152],
            [13.926, -1003.72],
            [15.111, -1003.248],
            [16.286, -1002.734],
            [17.449, -1002.179],
            [18.6, -1001.583],
            [19.738, -1000.946],
            [20.861, -1000.267],
            [21.97, -999.548],
            [23.063, -998.787],
            [24.139, -997.986],
            [25.197, -997.143],
            [26.237, -996.259],
            [27.257, -995.334],
            [28.257, -994.368],
            [29.236, -993.36],
            [30.193, -992.312],
            [31.127, -991.222],
            [32.037, -990.091],
            [32.923, -988.92],
            [33.783, -987.707],
            [34.616, -986.453],
            [35.422, -985.157],
            [36.2, -983.821],
            [36.949, -982.444],
            [37.668, -981.025],
            [38.356, -979.565],
            [39.012, -978.064],
            [39.635, -976.522],
            [40.225, -974.939],
            [40.781, -973.315],
            [41.301, -971.65],
            [41.785, -969.943],
            [42.232, -968.195],
            [42.642, -966.407]
          ],
          whiteDrop: [
            [-52.689, -922.879],
            [-51.633, -921.547],
            [-50.567, -920.246],
            [-49.491, -918.977],
            [-48.406, -917.74],
            [-47.311, -916.535],
            [-46.207, -915.361],
            [-45.094, -914.22],
            [-43.973, -913.11],
            [-42.844, -912.032],
            [-41.706, -910.985],
            [-40.561, -909.97],
            [-39.408, -908.987],
            [-38.248, -908.036],
            [-37.082, -907.116],
            [-35.908, -906.229],
            [-34.728, -905.372],
            [-33.541, -904.548],
            [-32.349, -903.755],
            [-31.151, -902.994],
            [-29.948, -902.264],
            [-28.739, -901.566],
            [-27.526, -900.9],
            [-26.308, -900.265],
            [-25.086, -899.662],
            [-23.859, -899.09],
            [-22.629, -898.55],
            [-21.395, -898.042],
            [-20.157, -897.565],
            [-18.917, -897.12],
            [-17.674, -896.707],
            [-16.428, -896.325],
            [-15.18, -895.974],
            [-13.93, -895.655],
            [-12.678, -895.368],
            [-11.424, -895.112],
            [-10.17, -894.887],
            [-8.914, -894.694],
            [-7.658, -894.533],
            [-6.401, -894.403],
            [-5.143, -894.304],
            [-3.886, -894.237],
            [-2.629, -894.201],
            [-1.373, -894.197],
            [-0.118, -894.224],
            [1.137, -894.283],
            [2.39, -894.373],
            [3.641, -894.495],
            [4.891, -894.648],
            [6.138, -894.832],
            [7.383, -895.048],
            [8.626, -895.295],
            [9.865, -895.573],
            [11.102, -895.883],
            [12.335, -896.224],
            [13.564, -896.596],
            [14.789, -897],
            [16.011, -897.435],
            [17.227, -897.901],
            [18.439, -898.399],
            [19.647, -898.928],
            [20.848, -899.488],
            [22.045, -900.08],
            [23.235, -900.703],
            [24.42, -901.357],
            [25.598, -902.042],
            [26.77, -902.758],
            [27.935, -903.506],
            [29.093, -904.285],
            [30.244, -905.095],
            [31.387, -905.937],
            [32.522, -906.809],
            [33.649, -907.713],
            [34.768, -908.648],
            [35.878, -909.614],
            [36.98, -910.611],
            [38.072, -911.64],
            [39.155, -912.699],
            [40.228, -913.79],
            [41.291, -914.912],
            [42.344, -916.065],
            [43.387, -917.249],
            [44.419, -918.464],
            [45.44, -919.71],
            [46.45, -920.987],
            [47.448, -922.296],
            [48.435, -923.635],
            [49.41, -925.005],
            [50.372, -926.407]
          ]
        },
        "corner-top-right": {
          blueRubber: [
            [1778.185, -942.972],
            [1779.925, -946.084],
            [1781.705, -949.044],
            [1783.522, -951.855],
            [1785.374, -954.52],
            [1787.26, -957.04],
            [1789.176, -959.418],
            [1791.12, -961.656],
            [1793.091, -963.756],
            [1795.086, -965.72],
            [1797.103, -967.551],
            [1799.14, -969.25],
            [1801.194, -970.821],
            [1803.263, -972.265],
            [1805.345, -973.584],
            [1807.439, -974.781],
            [1809.54, -975.858],
            [1811.648, -976.817],
            [1813.76, -977.661],
            [1815.875, -978.391],
            [1817.988, -979.009],
            [1820.1, -979.519],
            [1822.206, -979.922],
            [1824.306, -980.22],
            [1826.396, -980.416],
            [1828.475, -980.512],
            [1830.541, -980.51],
            [1832.591, -980.412],
            [1834.622, -980.22],
            [1836.633, -979.938],
            [1838.622, -979.566],
            [1840.587, -979.108],
            [1842.524, -978.565],
            [1844.432, -977.939],
            [1846.309, -977.233],
            [1848.152, -976.45],
            [1849.959, -975.59],
            [1851.729, -974.657],
            [1853.458, -973.653],
            [1855.145, -972.58],
            [1856.787, -971.44],
            [1858.382, -970.235],
            [1859.928, -968.967],
            [1861.423, -967.64],
            [1862.864, -966.254],
            [1864.25, -964.813],
            [1865.577, -963.318],
            [1866.845, -961.772],
            [1868.05, -960.177],
            [1869.19, -958.535],
            [1870.263, -956.848],
            [1871.268, -955.118],
            [1872.201, -953.349],
            [1873.061, -951.541],
            [1873.845, -949.698],
            [1874.551, -947.82],
            [1875.177, -945.912],
            [1875.72, -943.974],
            [1876.179, -942.01],
            [1876.551, -940.021],
            [1876.834, -938.009],
            [1877.026, -935.977],
            [1877.124, -933.926],
            [1877.127, -931.86],
            [1877.032, -929.781],
            [1876.837, -927.69],
            [1876.539, -925.589],
            [1876.137, -923.482],
            [1875.628, -921.37],
            [1875.01, -919.256],
            [1874.281, -917.141],
            [1873.438, -915.028],
            [1872.48, -912.919],
            [1871.404, -910.816],
            [1870.208, -908.722],
            [1868.889, -906.639],
            [1867.446, -904.569],
            [1865.877, -902.514],
            [1864.178, -900.476],
            [1862.348, -898.458],
            [1860.385, -896.462],
            [1858.286, -894.49],
            [1856.049, -892.544],
            [1853.673, -890.627],
            [1851.154, -888.741],
            [1848.49, -886.887],
            [1845.68, -885.069],
            [1842.721, -883.288],
            [1839.611, -881.546]
          ],
          whiteDrop: [
            [1748.089, -911.765],
            [1748.302, -910.585],
            [1748.526, -909.417],
            [1748.762, -908.26],
            [1749.008, -907.115],
            [1749.266, -905.983],
            [1749.536, -904.862],
            [1749.816, -903.753],
            [1750.108, -902.656],
            [1750.411, -901.57],
            [1750.725, -900.497],
            [1751.051, -899.435],
            [1751.387, -898.386],
            [1751.735, -897.348],
            [1752.094, -896.322],
            [1752.464, -895.308],
            [1752.846, -894.306],
            [1753.239, -893.315],
            [1753.643, -892.337],
            [1754.058, -891.37],
            [1754.485, -890.416],
            [1754.922, -889.473],
            [1755.371, -888.542],
            [1755.831, -887.623],
            [1756.303, -886.716],
            [1756.785, -885.82],
            [1757.279, -884.937],
            [1757.784, -884.065],
            [1758.3, -883.205],
            [1758.828, -882.357],
            [1759.367, -881.521],
            [1759.917, -880.697],
            [1760.478, -879.885],
            [1761.05, -879.084],
            [1761.634, -878.296],
            [1762.229, -877.519],
            [1762.835, -876.754],
            [1763.452, -876.001],
            [1764.081, -875.26],
            [1764.721, -874.531],
            [1765.372, -873.814],
            [1766.034, -873.108],
            [1766.707, -872.415],
            [1767.392, -871.733],
            [1768.088, -871.063],
            [1768.795, -870.405],
            [1769.513, -869.759],
            [1770.243, -869.124],
            [1770.984, -868.502],
            [1771.736, -867.891],
            [1772.499, -867.293],
            [1773.273, -866.706],
            [1774.059, -866.131],
            [1774.856, -865.568],
            [1775.664, -865.017],
            [1776.484, -864.477],
            [1777.314, -863.95],
            [1778.156, -863.434],
            [1779.009, -862.931],
            [1779.874, -862.439],
            [1780.749, -861.959],
            [1781.636, -861.491],
            [1782.534, -861.034],
            [1783.443, -860.59],
            [1784.363, -860.157],
            [1785.295, -859.737],
            [1786.238, -859.328],
            [1787.192, -858.931],
            [1788.157, -858.546],
            [1789.134, -858.173],
            [1790.122, -857.811],
            [1791.121, -857.462],
            [1792.131, -857.124],
            [1793.152, -856.799],
            [1794.185, -856.485],
            [1795.229, -856.183],
            [1796.284, -855.893],
            [1797.35, -855.615],
            [1798.428, -855.348],
            [1799.517, -855.094],
            [1800.617, -854.851],
            [1801.728, -854.62],
            [1802.851, -854.401],
            [1803.984, -854.194],
            [1805.129, -853.999],
            [1806.285, -853.816],
            [1807.453, -853.644],
            [1808.631, -853.485],
            [1809.821, -853.337]
          ]
        },
        "corner-bottom-right": {
          blueRubber: [
            [1839.611, 881.546],
            [1842.46, 883.347],
            [1845.172, 885.178],
            [1847.747, 887.038],
            [1850.189, 888.925],
            [1852.499, 890.837],
            [1854.678, 892.773],
            [1856.73, 894.729],
            [1858.656, 896.704],
            [1860.458, 898.697],
            [1862.138, 900.705],
            [1863.698, 902.725],
            [1865.139, 904.758],
            [1866.464, 906.799],
            [1867.676, 908.848],
            [1868.774, 910.903],
            [1869.763, 912.96],
            [1870.643, 915.02],
            [1871.417, 917.078],
            [1872.086, 919.135],
            [1872.653, 921.186],
            [1873.119, 923.232],
            [1873.487, 925.269],
            [1873.758, 927.296],
            [1873.935, 929.31],
            [1874.019, 931.311],
            [1874.012, 933.295],
            [1873.916, 935.261],
            [1873.734, 937.207],
            [1873.467, 939.131],
            [1873.117, 941.03],
            [1872.686, 942.904],
            [1872.177, 944.75],
            [1871.59, 946.566],
            [1870.928, 948.35],
            [1870.193, 950.1],
            [1869.387, 951.814],
            [1868.512, 953.491],
            [1867.57, 955.128],
            [1866.563, 956.723],
            [1865.492, 958.275],
            [1864.361, 959.781],
            [1863.169, 961.239],
            [1861.921, 962.648],
            [1860.617, 964.005],
            [1859.26, 965.309],
            [1857.851, 966.558],
            [1856.392, 967.749],
            [1854.887, 968.88],
            [1853.335, 969.951],
            [1851.74, 970.958],
            [1850.103, 971.9],
            [1848.427, 972.775],
            [1846.713, 973.58],
            [1844.963, 974.315],
            [1843.179, 974.976],
            [1841.364, 975.563],
            [1839.518, 976.072],
            [1837.645, 976.503],
            [1835.745, 976.852],
            [1833.822, 977.119],
            [1831.877, 977.301],
            [1829.911, 977.396],
            [1827.927, 977.402],
            [1825.928, 977.317],
            [1823.914, 977.14],
            [1821.887, 976.869],
            [1819.851, 976.5],
            [1817.806, 976.033],
            [1815.755, 975.466],
            [1813.699, 974.796],
            [1811.641, 974.021],
            [1809.583, 973.14],
            [1807.526, 972.151],
            [1805.473, 971.051],
            [1803.424, 969.839],
            [1801.384, 968.513],
            [1799.352, 967.071],
            [1797.332, 965.51],
            [1795.326, 963.829],
            [1793.334, 962.027],
            [1791.36, 960.1],
            [1789.404, 958.047],
            [1787.47, 955.866],
            [1785.559, 953.555],
            [1783.673, 951.112],
            [1781.814, 948.535],
            [1779.984, 945.823],
            [1778.185, 942.972]
          ],
          whiteDrop: [
            [1805.782, 847.964],
            [1804.695, 848.26],
            [1803.617, 848.566],
            [1802.548, 848.881],
            [1801.488, 849.206],
            [1800.437, 849.54],
            [1799.394, 849.884],
            [1798.361, 850.238],
            [1797.337, 850.601],
            [1796.321, 850.973],
            [1795.315, 851.355],
            [1794.317, 851.747],
            [1793.328, 852.148],
            [1792.349, 852.558],
            [1791.378, 852.978],
            [1790.417, 853.408],
            [1789.464, 853.846],
            [1788.52, 854.295],
            [1787.586, 854.752],
            [1786.66, 855.22],
            [1785.744, 855.696],
            [1784.836, 856.182],
            [1783.938, 856.677],
            [1783.049, 857.182],
            [1782.168, 857.696],
            [1781.297, 858.22],
            [1780.435, 858.752],
            [1779.583, 859.295],
            [1778.739, 859.846],
            [1777.904, 860.407],
            [1777.079, 860.977],
            [1776.263, 861.556],
            [1775.456, 862.145],
            [1774.658, 862.743],
            [1773.869, 863.35],
            [1773.09, 863.966],
            [1772.319, 864.592],
            [1771.558, 865.227],
            [1770.806, 865.871],
            [1770.064, 866.524],
            [1769.33, 867.187],
            [1768.606, 867.858],
            [1767.892, 868.539],
            [1767.186, 869.229],
            [1766.49, 869.929],
            [1765.803, 870.637],
            [1765.125, 871.354],
            [1764.457, 872.081],
            [1763.798, 872.817],
            [1763.149, 873.562],
            [1762.509, 874.316],
            [1761.878, 875.079],
            [1761.256, 875.851],
            [1760.644, 876.632],
            [1760.041, 877.422],
            [1759.448, 878.221],
            [1758.864, 879.03],
            [1758.29, 879.847],
            [1757.725, 880.673],
            [1757.169, 881.509],
            [1756.623, 882.353],
            [1756.087, 883.206],
            [1755.559, 884.069],
            [1755.042, 884.94],
            [1754.534, 885.82],
            [1754.035, 886.709],
            [1753.546, 887.607],
            [1753.066, 888.514],
            [1752.596, 889.43],
            [1752.136, 890.355],
            [1751.685, 891.289],
            [1751.243, 892.231],
            [1750.811, 893.183],
            [1750.389, 894.143],
            [1749.977, 895.112],
            [1749.574, 896.09],
            [1749.18, 897.077],
            [1748.796, 898.072],
            [1748.422, 899.077],
            [1748.058, 900.09],
            [1747.703, 901.112],
            [1747.358, 902.143],
            [1747.022, 903.182],
            [1746.697, 904.231],
            [1746.38, 905.288],
            [1746.074, 906.354],
            [1745.777, 907.428],
            [1745.491, 908.511],
            [1745.213, 909.603]
          ]
        },
        "middle-bottom": {
          blueRubber: [
            [-42.13, 957.209],
            [-41.511, 959.029],
            [-40.869, 960.808],
            [-40.204, 962.545],
            [-39.516, 964.24],
            [-38.807, 965.893],
            [-38.077, 967.504],
            [-37.326, 969.074],
            [-36.555, 970.601],
            [-35.765, 972.087],
            [-34.955, 973.531],
            [-34.127, 974.933],
            [-33.281, 976.293],
            [-32.418, 977.612],
            [-31.538, 978.888],
            [-30.641, 980.123],
            [-29.729, 981.315],
            [-28.802, 982.466],
            [-27.86, 983.575],
            [-26.904, 984.643],
            [-25.934, 985.668],
            [-24.951, 986.651],
            [-23.956, 987.593],
            [-22.949, 988.493],
            [-21.93, 989.351],
            [-20.901, 990.167],
            [-19.861, 990.941],
            [-18.812, 991.674],
            [-17.753, 992.364],
            [-16.685, 993.013],
            [-15.61, 993.62],
            [-14.526, 994.185],
            [-13.436, 994.708],
            [-12.339, 995.189],
            [-11.237, 995.629],
            [-10.128, 996.026],
            [-9.015, 996.382],
            [-7.898, 996.696],
            [-6.777, 996.968],
            [-5.652, 997.198],
            [-4.525, 997.386],
            [-3.396, 997.533],
            [-2.265, 997.637],
            [-1.133, 997.7],
            [0, 997.721],
            [1.133, 997.7],
            [2.265, 997.637],
            [3.396, 997.533],
            [4.525, 997.386],
            [5.652, 997.198],
            [6.777, 996.968],
            [7.898, 996.696],
            [9.015, 996.382],
            [10.128, 996.026],
            [11.237, 995.629],
            [12.339, 995.189],
            [13.436, 994.708],
            [14.526, 994.185],
            [15.61, 993.62],
            [16.685, 993.013],
            [17.753, 992.364],
            [18.812, 991.674],
            [19.861, 990.941],
            [20.901, 990.167],
            [21.93, 989.351],
            [22.949, 988.493],
            [23.956, 987.593],
            [24.951, 986.651],
            [25.934, 985.668],
            [26.904, 984.643],
            [27.86, 983.575],
            [28.802, 982.466],
            [29.729, 981.315],
            [30.641, 980.123],
            [31.538, 978.888],
            [32.418, 977.612],
            [33.281, 976.293],
            [34.127, 974.933],
            [34.955, 973.531],
            [35.765, 972.087],
            [36.555, 970.601],
            [37.326, 969.074],
            [38.077, 967.504],
            [38.807, 965.893],
            [39.516, 964.24],
            [40.204, 962.545],
            [40.869, 960.808],
            [41.511, 959.029],
            [42.13, 957.209]
          ],
          whiteDrop: [
            [52.35, 922.021],
            [51.752, 920.386],
            [51.113, 918.787],
            [50.436, 917.225],
            [49.72, 915.698],
            [48.967, 914.209],
            [48.177, 912.755],
            [47.352, 911.338],
            [46.493, 909.958],
            [45.6, 908.614],
            [44.674, 907.306],
            [43.717, 906.035],
            [42.728, 904.8],
            [41.709, 903.602],
            [40.662, 902.441],
            [39.586, 901.316],
            [38.483, 900.227],
            [37.353, 899.175],
            [36.198, 898.16],
            [35.019, 897.182],
            [33.816, 896.24],
            [32.59, 895.335],
            [31.342, 894.467],
            [30.074, 893.635],
            [28.785, 892.84],
            [27.478, 892.082],
            [26.152, 891.361],
            [24.809, 890.677],
            [23.449, 890.029],
            [22.074, 889.419],
            [20.685, 888.845],
            [19.282, 888.308],
            [17.866, 887.808],
            [16.438, 887.345],
            [15, 886.919],
            [13.551, 886.531],
            [12.093, 886.179],
            [10.628, 885.864],
            [9.154, 885.586],
            [7.675, 885.346],
            [6.19, 885.142],
            [4.701, 884.976],
            [3.208, 884.847],
            [1.712, 884.755],
            [0.214, 884.7],
            [-1.284, 884.683],
            [-2.782, 884.702],
            [-4.28, 884.759],
            [-5.776, 884.854],
            [-7.269, 884.985],
            [-8.758, 885.154],
            [-10.243, 885.361],
            [-11.722, 885.604],
            [-13.195, 885.886],
            [-14.66, 886.204],
            [-16.118, 886.56],
            [-17.566, 886.954],
            [-19.004, 887.385],
            [-20.432, 887.853],
            [-21.847, 888.359],
            [-23.25, 888.903],
            [-24.639, 889.484],
            [-26.014, 890.103],
            [-27.373, 890.759],
            [-28.715, 891.454],
            [-30.041, 892.185],
            [-31.348, 892.955],
            [-32.636, 893.762],
            [-33.904, 894.607],
            [-35.151, 895.49],
            [-36.376, 896.41],
            [-37.579, 897.368],
            [-38.758, 898.365],
            [-39.912, 899.399],
            [-41.041, 900.47],
            [-42.143, 901.58],
            [-43.218, 902.728],
            [-44.265, 903.913],
            [-45.283, 905.137],
            [-46.271, 906.398],
            [-47.227, 907.698],
            [-48.152, 909.035],
            [-49.045, 910.411],
            [-49.903, 911.825],
            [-50.727, 913.276],
            [-51.516, 914.766],
            [-52.268, 916.294],
            [-52.982, 917.86],
            [-53.659, 919.465]
          ]
        },
        "corner-bottom-left": {
          blueRubber: [
            [-1839.611, 881.546],
            [-1842.425, 883.285],
            [-1845.101, 885.057],
            [-1847.642, 886.859],
            [-1850.049, 888.691],
            [-1852.325, 890.549],
            [-1854.471, 892.432],
            [-1856.489, 894.339],
            [-1858.382, 896.266],
            [-1860.151, 898.213],
            [-1861.798, 900.176],
            [-1863.325, 902.155],
            [-1864.735, 904.147],
            [-1866.029, 906.15],
            [-1867.209, 908.162],
            [-1868.278, 910.181],
            [-1869.236, 912.205],
            [-1870.087, 914.232],
            [-1870.832, 916.261],
            [-1871.473, 918.289],
            [-1872.012, 920.314],
            [-1872.451, 922.334],
            [-1872.792, 924.348],
            [-1873.038, 926.352],
            [-1873.189, 928.347],
            [-1873.248, 930.328],
            [-1873.218, 932.295],
            [-1873.099, 934.245],
            [-1872.895, 936.176],
            [-1872.606, 938.087],
            [-1872.235, 939.976],
            [-1871.784, 941.839],
            [-1871.256, 943.676],
            [-1870.651, 945.485],
            [-1869.972, 947.263],
            [-1869.22, 949.008],
            [-1868.399, 950.719],
            [-1867.509, 952.394],
            [-1866.553, 954.03],
            [-1865.533, 955.626],
            [-1864.451, 957.179],
            [-1863.309, 958.688],
            [-1862.108, 960.15],
            [-1860.851, 961.564],
            [-1859.54, 962.928],
            [-1858.176, 964.239],
            [-1856.762, 965.496],
            [-1855.3, 966.697],
            [-1853.791, 967.839],
            [-1852.238, 968.921],
            [-1850.643, 969.941],
            [-1849.007, 970.897],
            [-1847.332, 971.786],
            [-1845.622, 972.607],
            [-1843.876, 973.358],
            [-1842.099, 974.037],
            [-1840.29, 974.642],
            [-1838.454, 975.17],
            [-1836.59, 975.621],
            [-1834.702, 975.991],
            [-1832.792, 976.279],
            [-1830.861, 976.483],
            [-1828.911, 976.601],
            [-1826.945, 976.631],
            [-1824.964, 976.571],
            [-1822.971, 976.42],
            [-1820.966, 976.174],
            [-1818.953, 975.832],
            [-1816.934, 975.392],
            [-1814.909, 974.852],
            [-1812.882, 974.21],
            [-1810.854, 973.465],
            [-1808.828, 972.613],
            [-1806.804, 971.654],
            [-1804.786, 970.585],
            [-1802.775, 969.404],
            [-1800.773, 968.109],
            [-1798.782, 966.698],
            [-1796.804, 965.17],
            [-1794.842, 963.522],
            [-1792.896, 961.752],
            [-1790.97, 959.858],
            [-1789.064, 957.839],
            [-1787.182, 955.692],
            [-1785.325, 953.415],
            [-1783.494, 951.007],
            [-1781.693, 948.465],
            [-1779.922, 945.788],
            [-1778.185, 942.972]
          ],
          whiteDrop: [
            [-1806.124, 848.419],
            [-1805.305, 848.482],
            [-1804.476, 848.57],
            [-1803.639, 848.685],
            [-1802.795, 848.825],
            [-1801.943, 848.991],
            [-1801.084, 849.181],
            [-1800.219, 849.396],
            [-1799.347, 849.634],
            [-1798.47, 849.896],
            [-1797.587, 850.181],
            [-1796.699, 850.489],
            [-1795.807, 850.819],
            [-1794.911, 851.171],
            [-1794.011, 851.544],
            [-1793.107, 851.939],
            [-1792.201, 852.354],
            [-1791.292, 852.789],
            [-1790.38, 853.244],
            [-1789.468, 853.719],
            [-1788.553, 854.212],
            [-1787.638, 854.724],
            [-1786.723, 855.254],
            [-1785.807, 855.802],
            [-1784.892, 856.368],
            [-1783.977, 856.95],
            [-1783.064, 857.549],
            [-1782.152, 858.164],
            [-1781.242, 858.794],
            [-1780.334, 859.44],
            [-1779.429, 860.101],
            [-1778.527, 860.776],
            [-1777.629, 861.466],
            [-1776.734, 862.169],
            [-1775.844, 862.885],
            [-1774.959, 863.614],
            [-1774.079, 864.355],
            [-1773.205, 865.109],
            [-1772.336, 865.874],
            [-1771.474, 866.65],
            [-1770.619, 867.437],
            [-1769.771, 868.234],
            [-1768.93, 869.041],
            [-1768.098, 869.858],
            [-1767.274, 870.684],
            [-1766.459, 871.519],
            [-1765.653, 872.362],
            [-1764.856, 873.213],
            [-1764.07, 874.071],
            [-1763.294, 874.937],
            [-1762.529, 875.809],
            [-1761.776, 876.687],
            [-1761.033, 877.571],
            [-1760.303, 878.461],
            [-1759.586, 879.355],
            [-1758.881, 880.255],
            [-1758.19, 881.158],
            [-1757.512, 882.065],
            [-1756.849, 882.976],
            [-1756.2, 883.89],
            [-1755.566, 884.806],
            [-1754.947, 885.724],
            [-1754.344, 886.644],
            [-1753.757, 887.565],
            [-1753.186, 888.487],
            [-1752.633, 889.41],
            [-1752.097, 890.333],
            [-1751.578, 891.255],
            [-1751.078, 892.177],
            [-1750.596, 893.098],
            [-1750.134, 894.017],
            [-1749.69, 894.934],
            [-1749.267, 895.849],
            [-1748.863, 896.761],
            [-1748.48, 897.669],
            [-1748.119, 898.574],
            [-1747.778, 899.475],
            [-1747.46, 900.372],
            [-1747.163, 901.264],
            [-1746.89, 902.15],
            [-1746.639, 903.031],
            [-1746.411, 903.906],
            [-1746.208, 904.774],
            [-1746.029, 905.636],
            [-1745.874, 906.49],
            [-1745.745, 907.336],
            [-1745.641, 908.175],
            [-1745.562, 909.004],
            [-1745.51, 909.825]
          ]
        },
        "corner-top-left": {
          blueRubber: [
            [-1778.185, -942.972],
            [-1779.97, -945.997],
            [-1781.79, -948.876],
            [-1783.644, -951.611],
            [-1785.53, -954.204],
            [-1787.444, -956.656],
            [-1789.386, -958.972],
            [-1791.353, -961.151],
            [-1793.342, -963.198],
            [-1795.353, -965.112],
            [-1797.382, -966.898],
            [-1799.427, -968.557],
            [-1801.487, -970.09],
            [-1803.56, -971.5],
            [-1805.643, -972.79],
            [-1807.733, -973.961],
            [-1809.83, -975.016],
            [-1811.931, -975.956],
            [-1814.033, -976.783],
            [-1816.135, -977.501],
            [-1818.235, -978.11],
            [-1820.33, -978.613],
            [-1822.419, -979.013],
            [-1824.498, -979.31],
            [-1826.567, -979.508],
            [-1828.623, -979.608],
            [-1830.663, -979.613],
            [-1832.687, -979.525],
            [-1834.691, -979.345],
            [-1836.673, -979.077],
            [-1838.632, -978.721],
            [-1840.566, -978.28],
            [-1842.471, -977.757],
            [-1844.347, -977.153],
            [-1846.19, -976.47],
            [-1848, -975.711],
            [-1849.773, -974.878],
            [-1851.508, -973.972],
            [-1853.202, -972.997],
            [-1854.854, -971.953],
            [-1856.461, -970.844],
            [-1858.021, -969.671],
            [-1859.532, -968.436],
            [-1860.992, -967.141],
            [-1862.399, -965.79],
            [-1863.751, -964.383],
            [-1865.046, -962.922],
            [-1866.281, -961.411],
            [-1867.454, -959.851],
            [-1868.563, -958.243],
            [-1869.607, -956.592],
            [-1870.583, -954.897],
            [-1871.489, -953.162],
            [-1872.322, -951.389],
            [-1873.082, -949.579],
            [-1873.764, -947.735],
            [-1874.369, -945.859],
            [-1874.893, -943.953],
            [-1875.334, -942.02],
            [-1875.69, -940.06],
            [-1875.959, -938.077],
            [-1876.139, -936.073],
            [-1876.228, -934.049],
            [-1876.224, -932.007],
            [-1876.124, -929.951],
            [-1875.926, -927.882],
            [-1875.629, -925.801],
            [-1875.231, -923.712],
            [-1874.728, -921.617],
            [-1874.12, -919.516],
            [-1873.403, -917.413],
            [-1872.576, -915.31],
            [-1871.637, -913.208],
            [-1870.583, -911.111],
            [-1869.413, -909.019],
            [-1868.124, -906.936],
            [-1866.715, -904.862],
            [-1865.182, -902.801],
            [-1863.525, -900.754],
            [-1861.74, -898.724],
            [-1859.827, -896.713],
            [-1857.782, -894.722],
            [-1855.603, -892.754],
            [-1853.289, -890.812],
            [-1850.837, -888.896],
            [-1848.246, -887.009],
            [-1845.512, -885.154],
            [-1842.635, -883.332],
            [-1839.611, -881.546]
          ],
          whiteDrop: [
            [-1749.941, -913.104],
            [-1750.246, -912.044],
            [-1750.561, -910.994],
            [-1750.884, -909.952],
            [-1751.216, -908.918],
            [-1751.557, -907.893],
            [-1751.907, -906.876],
            [-1752.266, -905.868],
            [-1752.634, -904.868],
            [-1753.011, -903.877],
            [-1753.397, -902.894],
            [-1753.792, -901.92],
            [-1754.196, -900.954],
            [-1754.608, -899.997],
            [-1755.03, -899.049],
            [-1755.46, -898.109],
            [-1755.899, -897.178],
            [-1756.347, -896.255],
            [-1756.804, -895.341],
            [-1757.27, -894.435],
            [-1757.745, -893.538],
            [-1758.229, -892.65],
            [-1758.721, -891.77],
            [-1759.222, -890.899],
            [-1759.732, -890.037],
            [-1760.251, -889.183],
            [-1760.779, -888.338],
            [-1761.316, -887.501],
            [-1761.861, -886.673],
            [-1762.415, -885.854],
            [-1762.978, -885.044],
            [-1763.55, -884.242],
            [-1764.13, -883.448],
            [-1764.719, -882.664],
            [-1765.318, -881.888],
            [-1765.924, -881.121],
            [-1766.54, -880.363],
            [-1767.164, -879.613],
            [-1767.797, -878.872],
            [-1768.439, -878.139],
            [-1769.089, -877.416],
            [-1769.749, -876.701],
            [-1770.417, -875.995],
            [-1771.093, -875.298],
            [-1771.778, -874.609],
            [-1772.472, -873.929],
            [-1773.175, -873.258],
            [-1773.886, -872.596],
            [-1774.607, -871.943],
            [-1775.335, -871.298],
            [-1776.073, -870.662],
            [-1776.819, -870.035],
            [-1777.573, -869.417],
            [-1778.337, -868.807],
            [-1779.108, -868.207],
            [-1779.889, -867.615],
            [-1780.678, -867.032],
            [-1781.476, -866.458],
            [-1782.282, -865.893],
            [-1783.097, -865.336],
            [-1783.921, -864.789],
            [-1784.753, -864.25],
            [-1785.594, -863.72],
            [-1786.443, -863.2],
            [-1787.301, -862.688],
            [-1788.167, -862.184],
            [-1789.042, -861.69],
            [-1789.926, -861.205],
            [-1790.818, -860.729],
            [-1791.718, -860.261],
            [-1792.628, -859.803],
            [-1793.545, -859.353],
            [-1794.471, -858.912],
            [-1795.406, -858.481],
            [-1796.349, -858.058],
            [-1797.301, -857.644],
            [-1798.261, -857.239],
            [-1799.229, -856.844],
            [-1800.207, -856.457],
            [-1801.192, -856.079],
            [-1802.186, -855.71],
            [-1803.188, -855.35],
            [-1804.199, -854.999],
            [-1805.219, -854.658],
            [-1806.246, -854.325],
            [-1807.283, -854.001],
            [-1808.327, -853.686],
            [-1809.38, -853.381],
            [-1810.442, -853.084]
          ]
        }
      };
      function toPoints(points) {
        return points.map(([x, y]) => ({ x, y }));
      }
      function createPocketOverride(pocketId, data) {
        return {
          source: `pocket-boundary-editor ${pocketId} high precision arc data`,
          collisionLines: [],
          dropEdges: [
            {
              id: `${pocketId}:white-drop-edge`,
              name: `${pocketId} white drop edge`,
              role: "pocket-drop-edge",
              material: "pocket-drop-edge",
              points: toPoints(data.whiteDrop)
            }
          ]
        };
      }
      var PRO_MATCH_84_OVERRIDES = Object.fromEntries(
        Object.entries(POCKET_BOUNDARY_POINT_DATA).map(([pocketId, pocketData]) => [
          pocketId,
          createPocketOverride(pocketId, pocketData)
        ])
      );
      var POCKET_BOUNDARY_OVERRIDES = {
        "pro-match-84": PRO_MATCH_84_OVERRIDES
      };
      function getPocketBoundaryOverride(boundaryId, pocketId) {
        return POCKET_BOUNDARY_OVERRIDES[boundaryId]?.[pocketId] || null;
      }
      module.exports = {
        POCKET_BOUNDARY_OVERRIDES,
        getPocketBoundaryOverride
      };
    }
  });

  // apps/three-game/src/core/model/tableColliderSet.js
  var require_tableColliderSet = __commonJS({
    "apps/three-game/src/core/model/tableColliderSet.js"(exports, module) {
      var { createTableModel } = require_tableModel();
      var { createRailGeometry } = require_railGeometry();
      var { createPocketGeometry } = require_pocketGeometry();
      var { createCompositeLineCollider, createLineCollider, createSphereCollider } = require_colliderPrimitives();
      var { getPocketBoundaryOverride } = require_pocketBoundaryOverrides();
      var { PRO_MATCH_84_FULL_PHYSICAL_BOUNDARIES } = require_proMatch84FullPhysicalBoundaries();
      var { getTableBoundaryById } = require_tableBoundaryPresets();
      function createBoundaryRails(boundary) {
        return boundary.rails.map((rail) => createLineCollider(
          rail.id,
          rail.start,
          rail.end,
          {
            role: "rail",
            material: "cushion"
          }
        ));
      }
      function clonePoint(point) {
        return { x: point.x, y: point.y };
      }
      function pointFromArray(point) {
        if (Array.isArray(point)) {
          return { x: point[0], y: point[1] };
        }
        return clonePoint(point);
      }
      function midpoint(points) {
        if (!points.length) {
          return null;
        }
        return clonePoint(points[Math.floor((points.length - 1) / 2)]);
      }
      function physicalBoundaryDataFor(boundary) {
        if (typeof TEST_FIELD_V2_BOUNDARY !== "undefined" && boundary?.id === TEST_FIELD_V2_BOUNDARY.id) {
          const { id, fitted } = TEST_FIELD_V2_BOUNDARY;
          const base = PRO_MATCH_84_FULL_PHYSICAL_BOUNDARIES;
          const lines = base.lines.map((line) => fitted[line.id] ? { ...line, polylineTableMm: fitted[line.id] } : line);
          if (lines.filter((line, index) => line !== base.lines[index]).length !== 18) {
            throw Error("V2 \u7403\u684C\u5019\u9009\u8FB9\u754C\u4E0E\u6D4B\u8BD5\u573A\u4E0D\u517C\u5BB9");
          }
          return { ...base, boundaryId: id, source: id, lines };
        }
        if (boundary?.id === PRO_MATCH_84_FULL_PHYSICAL_BOUNDARIES.boundaryId) {
          return PRO_MATCH_84_FULL_PHYSICAL_BOUNDARIES;
        }
        return null;
      }
      function pointsFromPhysicalLine(line) {
        const points = line.polylineTableMm || line.controlTableMm || [];
        return points.map(pointFromArray).filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
      }
      function createPhysicalBoundaryRails(physicalBoundary) {
        return physicalBoundary.lines.reduce((rails, line) => {
          if (line.boundaryType !== "straightRail") {
            return rails;
          }
          const points = pointsFromPhysicalLine(line);
          if (points.length >= 2) {
            rails.push(createLineCollider(
              line.id,
              points[0],
              points[points.length - 1],
              {
                role: "rail",
                material: "cushion"
              }
            ));
          }
          return rails;
        }, []);
      }
      function groupPhysicalLinesByArea(physicalBoundary) {
        const result = /* @__PURE__ */ new Map();
        physicalBoundary.lines.forEach((line) => {
          if (!line.areaId) {
            return;
          }
          if (!result.has(line.areaId)) {
            result.set(line.areaId, []);
          }
          result.get(line.areaId).push(line);
        });
        return result;
      }
      function createPhysicalPocketLip(line) {
        return createCompositeLineCollider(
          line.id,
          pointsFromPhysicalLine(line),
          {
            role: "pocket-lip",
            material: "pocket-lip"
          }
        );
      }
      function createPhysicalDropEdge(line) {
        return createDropEdge({
          id: line.id,
          name: line.name,
          points: pointsFromPhysicalLine(line)
        });
      }
      function createBlackHoleCapture(line) {
        if (!line?.circleTableMm?.center || !Number.isFinite(line.circleTableMm.radius) || line.circleTableMm.radius <= 0) {
          return null;
        }
        return {
          center: pointFromArray(line.circleTableMm.center),
          radius: line.circleTableMm.radius
        };
      }
      function symmetricPocketCircleCenters(boundary, linesByArea) {
        const centers = {};
        for (const type of ["middle", "corner"]) {
          const pockets = boundary.pockets.filter((pocket) => pocket.type === type);
          const circles = pockets.map((pocket) => createBlackHoleCapture(
            linesByArea.get(pocket.id)?.find((line) => line.boundaryType === "blackHole")
          ));
          if (circles.some((circle) => !circle)) continue;
          const meanY = circles.reduce((sum, circle) => sum + Math.abs(circle.center.y), 0) / circles.length;
          if (type === "middle") {
            centers.middle = { x: 0, y: meanY };
            continue;
          }
          const meanX = circles.reduce((sum, circle) => sum + Math.abs(circle.center.x), 0) / circles.length;
          const edge = linesByArea.get(pockets[0].id)?.find((line) => line.boundaryType === "dropJudge");
          if (!edge) continue;
          const points = pointsFromPhysicalLine(edge);
          const first = points[0], last = points.at(-1);
          if (!first || !last) continue;
          const axisOffset = (Math.abs(first.x) + Math.abs(last.x) - Math.abs(first.y) - Math.abs(last.y)) / 2;
          const shift = (meanX - meanY - axisOffset) / 2;
          centers.corner = { x: meanX - shift, y: meanY + shift };
        }
        return centers;
      }
      function createBoundaryPocketsFromPhysicalData(boundary, physicalBoundary) {
        const linesByArea = groupPhysicalLinesByArea(physicalBoundary);
        const symmetricCenters = typeof TEST_FIELD_V2_BOUNDARY === "undefined" || TEST_FIELD_V2_BOUNDARY.preserveClassic && physicalBoundary.source !== TEST_FIELD_V2_BOUNDARY.id ? {} : symmetricPocketCircleCenters(boundary, linesByArea);
        return boundary.pockets.map((pocket) => {
          const pocketLines = linesByArea.get(pocket.id) || [];
          const useIncomingPocketAngle = pocket.type === "middle" && typeof TEST_FIELD_V2_BOUNDARY !== "undefined" && physicalBoundary.source === TEST_FIELD_V2_BOUNDARY.id;
          const throatWidthMm = boundary.throatWidthMm[pocket.type];
          const mouthWidthMm = boundary.mouthWidthMm[pocket.type];
          const lips = pocketLines.filter((line) => line.boundaryType === "pocketRail" && pointsFromPhysicalLine(line).length >= 2).map((line) => {
            const lip = createPhysicalPocketLip(line);
            if (useIncomingPocketAngle) {
              for (const segment of lip.segments) {
                segment.contactInsetMm = 0.6;
                segment.incomingAnglePocketId = pocket.id;
              }
            }
            return lip;
          });
          const dropEdges = pocketLines.filter((line) => line.boundaryType === "dropJudge" && pointsFromPhysicalLine(line).length >= 2).map(createPhysicalDropEdge);
          const blackHole = createBlackHoleCapture(
            pocketLines.filter((line) => line.boundaryType === "blackHole").find((line) => createBlackHoleCapture(line))
          );
          const center = blackHole?.center || pocket.center;
          const captureRadius = blackHole?.radius || pocket.captureRadius;
          const symmetricCenter = symmetricCenters[pocket.type];
          const circleCenter = symmetricCenter ? {
            x: symmetricCenter.x * Math.sign(center.x),
            y: symmetricCenter.y * Math.sign(center.y)
          } : center;
          const openingCenter = midpoint(dropEdges[0]?.points || []) || pocket.center;
          return {
            id: pocket.id,
            type: pocket.type,
            side: pocket.side,
            center: { ...center },
            candidateRadius: pocket.candidateRadius,
            renderRadius: pocket.renderRadius,
            throatWidthMm,
            mouthWidthMm,
            dropDirection: { ...pocket.dropDirection },
            capture: createSphereCollider(
              `${pocket.id}:capture`,
              center,
              captureRadius
            ),
            blackHole: blackHole ? { center: { ...circleCenter }, radius: blackHole.radius } : null,
            pocketDefinition: {
              id: pocket.id,
              type: pocket.type,
              direction: { ...pocket.dropDirection }
            },
            openingDefinition: {
              center: openingCenter,
              throatWidthMm,
              mouthWidthMm
            },
            edgeDefinitions: lips,
            lips,
            dropEdges,
            boundaryOverrideSource: physicalBoundary.source,
            ...useIncomingPocketAngle && { useIncomingPocketAngle }
          };
        });
      }
      function createDropEdge(definition) {
        return {
          id: definition.id,
          name: definition.name,
          type: "polyline",
          role: definition.role || "pocket-drop-edge",
          material: definition.material || "pocket-drop-edge",
          points: definition.points.map(clonePoint)
        };
      }
      function createOverrideCollisionLine(definition) {
        return createCompositeLineCollider(
          definition.id,
          definition.points,
          {
            role: definition.role || "pocket-rubber-boundary",
            material: definition.material || "pocket-lip",
            restitution: definition.restitution,
            frictionMu: definition.frictionMu
          }
        );
      }
      function createBoundaryPockets(boundary) {
        return boundary.pockets.map((pocket) => {
          const throatWidthMm = boundary.throatWidthMm[pocket.type];
          const mouthWidthMm = boundary.mouthWidthMm[pocket.type];
          const override = getPocketBoundaryOverride(boundary.id, pocket.id);
          const lips = pocket.lips.map((lip) => ({
            id: lip.id,
            type: "composite-line",
            role: "pocket-lip",
            material: "pocket-lip",
            points: [],
            segments: lip.segments.map((segment) => createLineCollider(
              segment.id,
              segment.start,
              segment.end,
              {
                role: "pocket-lip",
                material: "pocket-lip"
              }
            ))
          }));
          const overrideCollisionLines = (override?.collisionLines || []).map(createOverrideCollisionLine);
          const dropEdges = (override?.dropEdges || []).map(createDropEdge);
          const edgeDefinitions = [...lips, ...overrideCollisionLines];
          return {
            id: pocket.id,
            type: pocket.type,
            side: pocket.side,
            center: { ...pocket.center },
            candidateRadius: pocket.candidateRadius,
            renderRadius: pocket.renderRadius,
            throatWidthMm,
            mouthWidthMm,
            dropDirection: { ...pocket.dropDirection },
            capture: createSphereCollider(
              `${pocket.id}:capture`,
              pocket.center,
              pocket.captureRadius
            ),
            pocketDefinition: {
              id: pocket.id,
              type: pocket.type,
              direction: { ...pocket.dropDirection }
            },
            openingDefinition: {
              center: { ...pocket.center },
              throatWidthMm,
              mouthWidthMm
            },
            edgeDefinitions,
            lips: edgeDefinitions,
            dropEdges,
            boundaryOverrideSource: override?.source || null
          };
        });
      }
      function createLegacyColliderSet(table) {
        const rails = createRailGeometry(table);
        const pockets = createPocketGeometry(table);
        const pocketLips = pockets.flatMap((pocket) => pocket.lips);
        const pocketCaptures = pockets.map((pocket) => pocket.capture);
        return {
          coordinateSystem: "center-origin-mm",
          rails,
          pockets,
          pocketLips,
          pocketCaptures
        };
      }
      function createBoundaryColliderSet(boundary = getTableBoundaryById()) {
        const physicalBoundary = physicalBoundaryDataFor(boundary);
        const rails = physicalBoundary ? createPhysicalBoundaryRails(physicalBoundary) : createBoundaryRails(boundary);
        const pockets = physicalBoundary ? createBoundaryPocketsFromPhysicalData(boundary, physicalBoundary) : createBoundaryPockets(boundary);
        const pocketLips = pockets.flatMap((pocket) => pocket.lips);
        const pocketCaptures = pockets.map((pocket) => pocket.capture);
        const pocketDropEdges = pockets.flatMap((pocket) => pocket.dropEdges || []);
        return {
          coordinateSystem: boundary.coordinateSystem,
          source: physicalBoundary?.source || boundary.source,
          boundaryId: boundary.id,
          boundaryName: physicalBoundary?.boundaryName || boundary.name,
          rails,
          pockets,
          pocketLips,
          pocketCaptures,
          pocketDropEdges,
          throatWidthMm: { ...boundary.throatWidthMm },
          mouthWidthMm: { ...boundary.mouthWidthMm }
        };
      }
      function createTableColliderSet(table = createTableModel(), options = {}) {
        if (options.model === "legacy" || table.physicalModel === "legacy") {
          return createLegacyColliderSet(table);
        }
        return createBoundaryColliderSet(
          options.boundary || getTableBoundaryById(options.boundaryId || options.tableBoundaryId)
        );
      }
      module.exports = {
        createBoundaryColliderSet,
        createTableColliderSet
      };
    }
  });

  // apps/three-game/src/game-client/practiceMode.js
  var require_practiceMode = __commonJS({
    "apps/three-game/src/game-client/practiceMode.js"(exports, module) {
      var { BALL_KIND, COLOR_ORDER } = require_constants();
      var { BALL_RADIUS_MM } = require_ballSpec();
      var { colorSpot } = require_spotModel();
      var {
        BAULK_LINE_X_MM,
        BLACK_SPOT_X_MM,
        HALF_PLAY_AREA_MM,
        PINK_SPOT_X_MM
      } = require_tableModel();
      var { createBallState } = require_ballState();
      var { createOpeningRackState } = require_openingRackState();
      var PRACTICE_SHAPE = Object.freeze({
        FULL_FRAME: "full-frame",
        HENDRY: "hendry",
        T_SHAPE: "t-shape",
        DOUBLE_DRAGON: "double-dragon",
        X_SHAPE: "x-shape",
        Y_SHAPE: "y-shape",
        SNAKE: "snake",
        TEN_RED_SURROUND: "ten-red-surround",
        SPOTTED_COLORS: "spotted-colors",
        SPOT_BLACK: "spot-black",
        SPOT_PINK: "spot-pink",
        RANDOM_LONG: "random-long"
      });
      var PRACTICE_SHAPES = Object.freeze([
        { id: PRACTICE_SHAPE.FULL_FRAME, label: "\u5B8C\u6574\u7403\u5C40", group: "\u5B9E\u6218\u7403\u578B" },
        { id: PRACTICE_SHAPE.HENDRY, label: "\u4EA8\u5F97\u5229\u7403\u578B", group: "\u5B9E\u6218\u7403\u578B" },
        { id: PRACTICE_SHAPE.SNAKE, label: "\u86C7\u5F69", group: "\u56F4\u7403\u7EC3\u4E60" },
        { id: PRACTICE_SHAPE.T_SHAPE, label: "T \u578B", group: "\u56F4\u7403\u7EC3\u4E60" },
        { id: PRACTICE_SHAPE.DOUBLE_DRAGON, label: "\u53CC\u9F99", group: "\u56F4\u7403\u7EC3\u4E60" },
        { id: PRACTICE_SHAPE.X_SHAPE, label: "X \u578B", group: "\u56F4\u7403\u7EC3\u4E60" },
        { id: PRACTICE_SHAPE.Y_SHAPE, label: "Y \u578B", group: "\u56F4\u7403\u7EC3\u4E60" },
        { id: PRACTICE_SHAPE.TEN_RED_SURROUND, label: "10 \u7EA2\u7403\u56F4\u7403", group: "\u56F4\u7403\u7EC3\u4E60" },
        { id: PRACTICE_SHAPE.SPOTTED_COLORS, label: "\u70B9\u4F4D\u5F69\u7403", group: "\u57FA\u672C\u529F\u7EC3\u4E60" },
        { id: "spot-black", label: "\u70B9\u4F4D\u9ED1\u7403", group: "\u57FA\u672C\u529F\u7EC3\u4E60" },
        { id: "spot-pink", label: "\u70B9\u4F4D\u7C89\u7403", group: "\u57FA\u672C\u529F\u7EC3\u4E60" },
        { id: "random-long", label: "\u968F\u673A\u8FDC\u53F0", group: "\u57FA\u672C\u529F\u7EC3\u4E60" }
      ]);
      var BasicPractice = require_basicPractice();
      var BALL_DIAMETER_MM = BALL_RADIUS_MM * 2;
      var PRACTICE_CUE_POSITIONS = Object.freeze({
        [PRACTICE_SHAPE.HENDRY]: Object.freeze({ x: HALF_PLAY_AREA_MM.width - 3 * BALL_RADIUS_MM, y: 0 }),
        [PRACTICE_SHAPE.DOUBLE_DRAGON]: Object.freeze({ x: BLACK_SPOT_X_MM - 300, y: -300 }),
        [PRACTICE_SHAPE.X_SHAPE]: Object.freeze({ x: 450, y: -300 }),
        [PRACTICE_SHAPE.Y_SHAPE]: Object.freeze({ x: BLACK_SPOT_X_MM - 300, y: -300 }),
        [PRACTICE_SHAPE.T_SHAPE]: Object.freeze({ x: 625, y: -250 }),
        [PRACTICE_SHAPE.SNAKE]: Object.freeze({ x: 1650, y: 300 }),
        [PRACTICE_SHAPE.TEN_RED_SURROUND]: Object.freeze({ x: 1100, y: -300 })
      });
      function evenlySpacedPoints(startX, endX, count) {
        return Array.from({ length: count }, (_, index) => ({
          x: startX + (endX - startX) * ((index + 1) / (count + 1)),
          y: 0
        }));
      }
      function createBall(id, kind, pos) {
        return createBallState(id, kind, pos, colorSpot(kind));
      }
      function createCueBall(shapeId) {
        const position = PRACTICE_CUE_POSITIONS[shapeId] || {
          x: BAULK_LINE_X_MM,
          y: BALL_DIAMETER_MM + 20
        };
        return createBallState("cue", BALL_KIND.CUE, {
          ...position
        });
      }
      function createColors() {
        return COLOR_ORDER.map((kind) => createBall(kind, kind, colorSpot(kind)));
      }
      function createTShapeReds() {
        const armSpacing = (BLACK_SPOT_X_MM - PINK_SPOT_X_MM) / 6;
        return [
          ...Array.from({ length: 5 }, (_, index) => ({
            x: PINK_SPOT_X_MM,
            y: -(index + 1) * armSpacing
          })),
          ...Array.from({ length: 5 }, (_, index) => ({
            x: PINK_SPOT_X_MM,
            y: (index + 1) * armSpacing
          })),
          ...evenlySpacedPoints(PINK_SPOT_X_MM, BLACK_SPOT_X_MM, 5)
        ];
      }
      function createDoubleDragonReds() {
        const previous = evenlySpacedPoints(BLACK_SPOT_X_MM - 80, PINK_SPOT_X_MM + BALL_RADIUS_MM, 15);
        const bottom = previous[0].x + BALL_DIAMETER_MM / 3;
        const top = previous[14].x - BALL_DIAMETER_MM / 3;
        const previousPitch = (bottom - top) / 7;
        const eightTop = top - BALL_DIAMETER_MM / 2;
        const sevenBottom = bottom - previousPitch / 2 + BALL_DIAMETER_MM / 2;
        const sevenTop = top + previousPitch / 2 - BALL_DIAMETER_MM / 2;
        return Array.from({ length: 15 }, (_, i) => {
          const seven = i % 2 === 1;
          const start = (seven ? sevenBottom : bottom) - BALL_DIAMETER_MM / 3;
          const end = seven ? sevenTop : eightTop;
          const intervals = seven ? 6 : 7;
          const index = Math.floor(i / 2);
          const firstGap = (start - end - intervals * BALL_DIAMETER_MM) / (1.5 * intervals);
          const gapSum = firstGap * (index + index * (index - 1) / (2 * (intervals - 1)));
          return {
            x: start - index * BALL_DIAMETER_MM - gapSum + (seven ? 0 : BALL_DIAMETER_MM / 4) + 5,
            y: (seven ? 1 : -1) * BALL_DIAMETER_MM
          };
        });
      }
      function createXShapeReds(pockets) {
        pockets ||= require_tableColliderSet().createTableColliderSet().pockets;
        const mouth = (id) => {
          const p = pockets.find((p2) => p2.id === id);
          return p.openingDefinition?.center || p.center;
        };
        const centre = colorSpot(BALL_KIND.PINK);
        const a = mouth("corner-bottom-right"), c = mouth("corner-top-right");
        const b = { x: 2 * centre.x - a.x, y: 2 * centre.y - a.y };
        const d = { x: 2 * centre.x - c.x, y: 2 * centre.y - c.y };
        return [a, c, d, b].flatMap((end, arm) => {
          const dx = end.x - centre.x, dy = end.y - centre.y, length = Math.hypot(dx, dy);
          return Array.from({ length: arm === 3 ? 3 : 4 }, (_, i) => ({
            x: centre.x + dx / length * (i + 1) * BALL_DIAMETER_MM * 1.8,
            y: centre.y + dy / length * (i + 1) * BALL_DIAMETER_MM * 1.8
          }));
        });
      }
      function createYShapeReds() {
        const step = (BLACK_SPOT_X_MM - PINK_SPOT_X_MM) / 6;
        const armStep = step / Math.hypot(1, 1.12);
        return [
          ...evenlySpacedPoints(BLACK_SPOT_X_MM, PINK_SPOT_X_MM, 5),
          ...[-1, 1].flatMap((side) => Array.from({ length: 5 }, (_, i) => ({
            x: PINK_SPOT_X_MM - (i + 1) * armStep,
            y: side * (i + 1) * armStep * 1.12
          })))
        ];
      }
      function createHendryReds() {
        const endX = HALF_PLAY_AREA_MM.width - 3 * BALL_RADIUS_MM;
        const sideY = HALF_PLAY_AREA_MM.height - 3 * BALL_RADIUS_MM;
        const triangleX = PINK_SPOT_X_MM + (BLACK_SPOT_X_MM - PINK_SPOT_X_MM) * 0.4;
        const pitch = BALL_DIAMETER_MM + 0.2;
        return [
          ...[-1, 1].flatMap((side) => [-HALF_PLAY_AREA_MM.width * 0.65 + 3 * BALL_DIAMETER_MM, HALF_PLAY_AREA_MM.width * 0.15 + 2 * BALL_DIAMETER_MM, HALF_PLAY_AREA_MM.width * 0.65].map((x) => ({ x, y: side * sideY }))),
          ...[-1, 1].flatMap((end) => [-1, 1].map((side) => ({ x: end * endX, y: side * HALF_PLAY_AREA_MM.height * 0.4 }))),
          { x: PINK_SPOT_X_MM * 0.5, y: 0 },
          { x: triangleX, y: -pitch * 0.5 },
          { x: triangleX, y: pitch * 0.5 },
          { x: triangleX + pitch * Math.sqrt(3) / 2, y: 0 },
          { x: BLACK_SPOT_X_MM - 140, y: 0 }
        ];
      }
      function createSnakeReds() {
        return [
          ...evenlySpacedPoints(BLACK_SPOT_X_MM, HALF_PLAY_AREA_MM.width, 4),
          ...evenlySpacedPoints(PINK_SPOT_X_MM, BLACK_SPOT_X_MM, 5),
          ...evenlySpacedPoints(0, PINK_SPOT_X_MM, 6)
        ];
      }
      function createTenRedSurroundReds() {
        const sixRedRack = createOpeningRackState().filter((ball) => ball.kind === BALL_KIND.RED).slice(0, 6).map((ball) => ({ ...ball.pos }));
        const blackToEndCushionMidpointDistance = (HALF_PLAY_AREA_MM.width - BLACK_SPOT_X_MM) * 0.5;
        return [
          ...sixRedRack,
          { x: BLACK_SPOT_X_MM, y: -HALF_PLAY_AREA_MM.height * 0.5 },
          { x: (BLACK_SPOT_X_MM + HALF_PLAY_AREA_MM.width) * 0.5, y: 0 },
          { x: BLACK_SPOT_X_MM, y: HALF_PLAY_AREA_MM.height * 0.5 },
          { x: BLACK_SPOT_X_MM - blackToEndCushionMidpointDistance, y: 0 }
        ];
      }
      function createPatternBalls(shapeId, redPositions) {
        return [
          createCueBall(shapeId),
          ...createColors(),
          ...redPositions.map((pos, index) => createBallState(
            `red-${index + 1}`,
            BALL_KIND.RED,
            pos
          ))
        ];
      }
      function spottedColorsStance(pockets) {
        pockets ||= require_tableColliderSet().createTableColliderSet().pockets;
        const yellow = colorSpot(BALL_KIND.YELLOW), green = colorSpot(BALL_KIND.GREEN);
        const mouth = (id) => {
          const pocket = pockets.find((p) => p.id === id);
          return pocket.openingDefinition?.center || pocket.center;
        };
        const a = mouth("corner-bottom-left"), b = mouth("corner-top-left");
        const u = { x: a.x - yellow.x, y: a.y - yellow.y }, v = { x: b.x - green.x, y: b.y - green.y };
        const t = ((green.x - yellow.x) * v.y - (green.y - yellow.y) * v.x) / (u.x * v.y - u.y * v.x);
        const position = { x: yellow.x + t * u.x, y: yellow.y + t * u.y };
        const length = Math.hypot(yellow.x - position.x, yellow.y - position.y);
        return { position, direction: { x: (yellow.x - position.x) / length, y: (yellow.y - position.y) / length } };
      }
      function createPracticeBalls(shapeId = PRACTICE_SHAPE.FULL_FRAME, pockets) {
        if (BasicPractice.isStreak(shapeId)) return BasicPractice.balls(shapeId);
        if (shapeId === PRACTICE_SHAPE.SPOTTED_COLORS) {
          return [createBallState("cue", BALL_KIND.CUE, spottedColorsStance(pockets).position), ...createColors()];
        }
        if (shapeId === PRACTICE_SHAPE.HENDRY) return createPatternBalls(shapeId, createHendryReds());
        if (shapeId === PRACTICE_SHAPE.DOUBLE_DRAGON) {
          const reds = createDoubleDragonReds();
          const target = reds[0];
          const tablePockets = pockets || require_tableColliderSet().createTableColliderSet().pockets;
          const pocket = tablePockets.find((p) => p.id === "corner-bottom-right");
          const mouth = pocket.openingDefinition?.center || pocket.center;
          const dx = mouth.x - target.x, dy = mouth.y - target.y;
          const distance = Math.hypot(dx, dy);
          const stance = PRACTICE_CUE_POSITIONS[shapeId];
          const cueDistance = Math.hypot(stance.x - target.x, stance.y - target.y);
          const balls = createPatternBalls(shapeId, reds);
          const position = { x: target.x - dx / distance * cueDistance, y: target.y - dy / distance * cueDistance };
          balls[0].pos = position;
          balls[0].prevPos = { ...position };
          return balls;
        }
        if (shapeId === PRACTICE_SHAPE.X_SHAPE) return createPatternBalls(shapeId, createXShapeReds(pockets));
        if (shapeId === PRACTICE_SHAPE.Y_SHAPE) return createPatternBalls(shapeId, createYShapeReds());
        if (shapeId === PRACTICE_SHAPE.T_SHAPE) {
          return createPatternBalls(shapeId, createTShapeReds());
        }
        if (shapeId === PRACTICE_SHAPE.SNAKE) {
          return createPatternBalls(shapeId, createSnakeReds());
        }
        if (shapeId === PRACTICE_SHAPE.TEN_RED_SURROUND) {
          return createPatternBalls(shapeId, createTenRedSurroundReds());
        }
        return createOpeningRackState();
      }
      function practiceShapeLabel(shapeId = PRACTICE_SHAPE.FULL_FRAME) {
        return PRACTICE_SHAPES.find((shape) => shape.id === shapeId)?.label || PRACTICE_SHAPES[0].label;
      }
      function createPracticeUndoHistory() {
        const snapshots = [];
        return {
          clear() {
            snapshots.length = 0;
          },
          length() {
            return snapshots.length;
          },
          pop() {
            return snapshots.pop() || null;
          },
          push(snapshot) {
            if (!snapshot) return false;
            snapshots.push(snapshot);
            return true;
          }
        };
      }
      function createPracticeShotHistoryEntry(matchStateSnapshot, shotInput = {}) {
        if (!matchStateSnapshot) return null;
        return {
          matchStateSnapshot,
          aimDirection: shotInput.direction ? { x: Number(shotInput.direction.x) || 0, y: Number(shotInput.direction.y) || 0 } : null,
          tipOffset: {
            x: Number(shotInput.tipOffset?.x) || 0,
            y: Number(shotInput.tipOffset?.y) || 0
          }
        };
      }
      function resolvePracticeShotHistoryEntry(entry) {
        if (!entry) return null;
        if (entry.matchStateSnapshot) return entry;
        return {
          matchStateSnapshot: entry,
          aimDirection: null,
          tipOffset: { x: 0, y: 0 }
        };
      }
      function restorePracticeShotHistoryEntry(entry, applyMatchState) {
        const resolved = resolvePracticeShotHistoryEntry(entry);
        if (!resolved || typeof applyMatchState !== "function") return null;
        applyMatchState(resolved.matchStateSnapshot, {
          force: true,
          cueBallPlacementArea: "table"
        });
        return resolved;
      }
      module.exports = {
        spottedColorsStance,
        PRACTICE_SHAPE,
        PRACTICE_SHAPES,
        PRACTICE_CUE_POSITIONS,
        createPracticeBalls,
        createPracticeShotHistoryEntry,
        createPracticeUndoHistory,
        createHendryReds,
        createDoubleDragonReds,
        createXShapeReds,
        createYShapeReds,
        createSnakeReds,
        createTenRedSurroundReds,
        createTShapeReds,
        evenlySpacedPoints,
        practiceShapeLabel,
        resolvePracticeShotHistoryEntry,
        restorePracticeShotHistoryEntry
      };
    }
  });

  // apps/three-game/src/render/canvasPrimitives.js
  var require_canvasPrimitives = __commonJS({
    "apps/three-game/src/render/canvasPrimitives.js"(exports, module) {
      (function installCanvasPrimitives(root, factory) {
        const api = factory();
        if (typeof module === "object" && module.exports) {
          module.exports = api;
        }
        if (root) {
          root.SnookerCanvasPrimitives = api;
        }
      })(typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : exports, function createCanvasPrimitives() {
        function rectFrom(rect = {}) {
          return {
            x: Number(rect.x ?? rect.left) || 0,
            y: Number(rect.y ?? rect.top) || 0,
            width: Math.max(0, Number(rect.width) || 0),
            height: Math.max(0, Number(rect.height) || 0)
          };
        }
        function pointInRect(point, rect) {
          const bounds = rectFrom(rect);
          return Boolean(
            point && point.x >= bounds.x && point.x <= bounds.x + bounds.width && point.y >= bounds.y && point.y <= bounds.y + bounds.height
          );
        }
        function roundRect(ctx, rect, radius = 0) {
          const bounds = rectFrom(rect);
          const r = Math.max(0, Math.min(Number(radius) || 0, bounds.width * 0.5, bounds.height * 0.5));
          ctx.beginPath();
          ctx.moveTo(bounds.x + r, bounds.y);
          ctx.lineTo(bounds.x + bounds.width - r, bounds.y);
          ctx.quadraticCurveTo(bounds.x + bounds.width, bounds.y, bounds.x + bounds.width, bounds.y + r);
          ctx.lineTo(bounds.x + bounds.width, bounds.y + bounds.height - r);
          ctx.quadraticCurveTo(
            bounds.x + bounds.width,
            bounds.y + bounds.height,
            bounds.x + bounds.width - r,
            bounds.y + bounds.height
          );
          ctx.lineTo(bounds.x + r, bounds.y + bounds.height);
          ctx.quadraticCurveTo(bounds.x, bounds.y + bounds.height, bounds.x, bounds.y + bounds.height - r);
          ctx.lineTo(bounds.x, bounds.y + r);
          ctx.quadraticCurveTo(bounds.x, bounds.y, bounds.x + r, bounds.y);
          ctx.closePath();
        }
        function drawImageCover(ctx, image, rect) {
          const bounds = rectFrom(rect);
          const imageWidth = image?.naturalWidth || image?.width || 0;
          const imageHeight = image?.naturalHeight || image?.height || 0;
          if (!imageWidth || !imageHeight || bounds.width <= 0 || bounds.height <= 0) return false;
          const scale = Math.max(bounds.width / imageWidth, bounds.height / imageHeight);
          const sourceWidth = bounds.width / scale;
          const sourceHeight = bounds.height / scale;
          const sourceX = (imageWidth - sourceWidth) * 0.5;
          const sourceY = (imageHeight - sourceHeight) * 0.5;
          ctx.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, bounds.x, bounds.y, bounds.width, bounds.height);
          return true;
        }
        return {
          drawImageCover,
          pointInRect,
          rectFrom,
          roundRect
        };
      });
    }
  });

  // apps/three-game/src/render/hud/canvasControlsRenderer.js
  var require_canvasControlsRenderer = __commonJS({
    "apps/three-game/src/render/hud/canvasControlsRenderer.js"(exports, module) {
      (function installCanvasControlsRenderer(root, factory) {
        let CanvasPrimitives = root?.SnookerCanvasPrimitives || null;
        if (typeof module === "object" && module.exports) {
          CanvasPrimitives = CanvasPrimitives || require_canvasPrimitives();
        }
        const api = factory(CanvasPrimitives);
        if (typeof module === "object" && module.exports) {
          module.exports = api;
        }
        if (root) {
          root.SnookerCanvasControlsRenderer = api;
        }
      })(typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : exports, function createCanvasControlsRenderer(CanvasPrimitives) {
        const DEFAULT_TEXT_COLOR = "#f7f1df";
        const FONT_FAMILY = "system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
        function createButton(id, label, x, y, width, height, extra = {}) {
          return { id, label, x, y, width, height, ...extra };
        }
        function drawInteractionOverlay(ctx, rect, options = {}) {
          const hovered = options.hovered === true || options.pressed === true;
          const pressed = options.pressed === true;
          if (!hovered) return;
          ctx.fillStyle = options.hoverFill || "rgba(255, 255, 255, 0.065)";
          CanvasPrimitives.roundRect(ctx, rect, Number.isFinite(Number(options.radius)) ? Number(options.radius) : 10);
          ctx.fill();
          if (pressed) {
            ctx.fillStyle = options.pressedFill || "rgba(0, 0, 0, 0.18)";
            CanvasPrimitives.roundRect(ctx, rect, Number.isFinite(Number(options.radius)) ? Number(options.radius) : 10);
            ctx.fill();
          }
        }
        function drawButton(ctx, button, options = {}) {
          ctx.save();
          ctx.fillStyle = options.fill || "rgba(10, 12, 15, 0.72)";
          ctx.strokeStyle = options.stroke || "rgba(255, 255, 255, 0.18)";
          ctx.lineWidth = Number.isFinite(Number(options.lineWidth)) ? Number(options.lineWidth) : 1.5;
          CanvasPrimitives.roundRect(ctx, button, Number.isFinite(Number(options.radius)) ? Number(options.radius) : 10);
          ctx.fill();
          drawInteractionOverlay(ctx, button, options);
          if (options.hovered || options.pressed) {
            ctx.strokeStyle = options.interactionStroke || "rgba(241, 210, 132, 0.62)";
          }
          if (options.stroke !== false) ctx.stroke();
          ctx.fillStyle = options.text || DEFAULT_TEXT_COLOR;
          ctx.font = options.font || `700 22px ${FONT_FAMILY}`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(String(button?.label ?? ""), button.x + button.width * 0.5, button.y + button.height * 0.5 + (Number(options.textOffsetY) || 0));
          ctx.restore();
          return button;
        }
        function drawIconButton(ctx, button, icon, options = {}) {
          ctx.save();
          ctx.fillStyle = options.fill || "rgba(10, 12, 15, 0.66)";
          ctx.strokeStyle = options.stroke || "rgba(255, 255, 255, 0.20)";
          ctx.lineWidth = Number.isFinite(Number(options.lineWidth)) ? Number(options.lineWidth) : 1.5;
          CanvasPrimitives.roundRect(ctx, button, Number.isFinite(Number(options.radius)) ? Number(options.radius) : 12);
          ctx.fill();
          drawInteractionOverlay(ctx, button, { ...options, radius: Number.isFinite(Number(options.radius)) ? Number(options.radius) : 12 });
          if (options.hovered || options.pressed) {
            ctx.strokeStyle = options.interactionStroke || "rgba(241, 210, 132, 0.62)";
          }
          if (options.stroke !== false) ctx.stroke();
          ctx.strokeStyle = options.iconColor || DEFAULT_TEXT_COLOR;
          ctx.fillStyle = options.iconColor || DEFAULT_TEXT_COLOR;
          ctx.lineWidth = Number.isFinite(Number(options.iconLineWidth)) ? Number(options.iconLineWidth) : 3;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          const cx = button.x + button.width * 0.5;
          const cy = button.y + button.height * 0.5;
          if (options.iconImage) {
            const sourceWidth = Number(options.iconImage.naturalWidth || options.iconImage.width) || 1;
            const sourceHeight = Number(options.iconImage.naturalHeight || options.iconImage.height) || 1;
            const maxSize = Math.min(button.width, button.height) * 0.58;
            const scale = Math.min(maxSize / sourceWidth, maxSize / sourceHeight);
            const width = sourceWidth * scale;
            const height = sourceHeight * scale;
            ctx.drawImage(options.iconImage, cx - width * 0.5, cy - height * 0.5, width, height);
          } else if (icon === "chat") {
            ctx.beginPath();
            CanvasPrimitives.roundRect(ctx, { x: cx - 14, y: cy - 11, width: 28, height: 20 }, 5);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(cx - 7, cy + 9);
            ctx.lineTo(cx - 11, cy + 15);
            ctx.lineTo(cx + 1, cy + 9);
            ctx.stroke();
          } else if (icon === "close") {
            ctx.beginPath();
            ctx.moveTo(cx - 11, cy - 11);
            ctx.lineTo(cx + 11, cy + 11);
            ctx.moveTo(cx + 11, cy - 11);
            ctx.lineTo(cx - 11, cy + 11);
            ctx.stroke();
          }
          ctx.restore();
          return button;
        }
        function drawPanelShell(ctx, panel, options = {}) {
          ctx.save();
          if (options.overlayRect) {
            ctx.fillStyle = options.overlayFill || "rgba(0, 0, 0, 0.42)";
            ctx.fillRect(options.overlayRect.x, options.overlayRect.y, options.overlayRect.width, options.overlayRect.height);
          }
          ctx.shadowColor = options.shadowColor || "rgba(0, 0, 0, 0.48)";
          ctx.shadowBlur = Number.isFinite(Number(options.shadowBlur)) ? Number(options.shadowBlur) : 22;
          ctx.fillStyle = options.fill || "rgba(13, 18, 24, 0.94)";
          ctx.strokeStyle = options.stroke || "rgba(255, 255, 255, 0.18)";
          ctx.lineWidth = Number.isFinite(Number(options.lineWidth)) ? Number(options.lineWidth) : 1.4;
          CanvasPrimitives.roundRect(ctx, panel, Number.isFinite(Number(options.radius)) ? Number(options.radius) : 14);
          ctx.fill();
          if (options.stroke !== false) ctx.stroke();
          ctx.restore();
        }
        function drawToggle(ctx, track, value, options = {}) {
          ctx.save();
          ctx.fillStyle = value ? options.activeFill || "#d8be68" : options.inactiveFill || "rgba(255,255,255,0.18)";
          CanvasPrimitives.roundRect(ctx, track, track.height * 0.5);
          ctx.fill();
          drawInteractionOverlay(ctx, track, {
            ...options,
            radius: track.height * 0.5,
            hoverFill: options.hoverFill || "rgba(255, 255, 255, 0.08)"
          });
          ctx.fillStyle = options.knobFill || "#f9f0cf";
          ctx.beginPath();
          ctx.arc(track.x + (value ? track.width - track.height * 0.58 : track.height * 0.58), track.y + track.height * 0.5, track.height * 0.375, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
        function drawToast(ctx, rect, text, options = {}) {
          ctx.save();
          ctx.globalAlpha = Number.isFinite(Number(options.opacity)) ? Number(options.opacity) : 1;
          ctx.fillStyle = options.fill || "rgba(14, 38, 18, 0.72)";
          ctx.strokeStyle = options.stroke || "rgba(255, 255, 255, 0.30)";
          ctx.lineWidth = Number.isFinite(Number(options.lineWidth)) ? Number(options.lineWidth) : 1.4;
          CanvasPrimitives.roundRect(ctx, rect, Number.isFinite(Number(options.radius)) ? Number(options.radius) : 8);
          ctx.fill();
          if (options.stroke !== false) ctx.stroke();
          ctx.fillStyle = options.textColor || DEFAULT_TEXT_COLOR;
          let fontSize = Number.isFinite(Number(options.fontSize)) ? Number(options.fontSize) : 23;
          const minFontSize = Number.isFinite(Number(options.minFontSize)) ? Number(options.minFontSize) : 17;
          const horizontalPadding = Number(options.horizontalPadding) || 44;
          do {
            ctx.font = `700 ${fontSize}px ${FONT_FAMILY}`;
            if (ctx.measureText(String(text)).width <= rect.width - horizontalPadding) break;
            fontSize -= 1;
          } while (fontSize > minFontSize);
          ctx.textAlign = options.textAlign === "left" ? "left" : "center";
          ctx.textBaseline = "middle";
          const textX = ctx.textAlign === "left" ? rect.x + horizontalPadding * 0.5 : rect.x + rect.width * 0.5;
          ctx.fillText(String(text), textX, rect.y + rect.height * 0.5 + (Number(options.textOffsetY) || 1), rect.width - horizontalPadding);
          ctx.restore();
        }
        return {
          createButton,
          drawButton,
          drawIconButton,
          drawInteractionOverlay,
          drawPanelShell,
          drawToast,
          drawToggle
        };
      });
    }
  });

  // apps/three-game/src/core/rules/breakState.js
  var require_breakState = __commonJS({
    "apps/three-game/src/core/rules/breakState.js"(exports, module) {
      (function installBreakState(root, factory) {
        const api = factory(root || {});
        if (typeof module === "object" && module.exports) {
          module.exports = api;
        }
        if (root) {
          root.SnookerBreakState = api;
        }
      })(typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : exports, function createBreakStateApi(root) {
        const { BALL_KIND, COLOR_ORDER } = typeof __require === "function" ? require_constants() : {
          BALL_KIND: root.SnookerConstants?.BALL_KIND || {
            CUE: "cue",
            RED: "red",
            YELLOW: "yellow",
            GREEN: "green",
            BROWN: "brown",
            BLUE: "blue",
            PINK: "pink",
            BLACK: "black"
          },
          COLOR_ORDER: root.SnookerConstants?.COLOR_ORDER || ["yellow", "green", "brown", "blue", "pink", "black"]
        };
        const { BALL_VALUES } = typeof __require === "function" ? require_ballSpec() : {
          BALL_VALUES: root.SnookerBallSpec?.BALL_VALUES || {
            cue: 0,
            red: 1,
            yellow: 2,
            green: 3,
            brown: 4,
            blue: 5,
            pink: 6,
            black: 7
          }
        };
        const BREAK_SCORE_ORDER = [BALL_KIND.RED, ...COLOR_ORDER];
        function ballScoreValue(kind) {
          return BALL_VALUES[kind] || 0;
        }
        function createBreakCounts(source = {}) {
          return Object.fromEntries(BREAK_SCORE_ORDER.map((kind) => [kind, Number(source[kind]) || 0]));
        }
        function createBreakState() {
          return {
            score: 0,
            lastPotKind: "",
            pottedBallIds: [],
            scoredEventKeys: [],
            counts: createBreakCounts()
          };
        }
        function cloneBreakState(state) {
          const source = state || createBreakState();
          return {
            score: Number(source.score) || 0,
            lastPotKind: source.lastPotKind || "",
            pottedBallIds: [...source.pottedBallIds || []],
            scoredEventKeys: [...source.scoredEventKeys || []],
            counts: createBreakCounts(source.counts || {})
          };
        }
        function kindFromLookup(kindLookup, event) {
          if (event.ballKind) return event.ballKind;
          if (typeof kindLookup === "function") return kindLookup(event.ballId, event);
          if (kindLookup?.get) return kindLookup.get(event.ballId);
          return kindLookup?.[event.ballId] || "";
        }
        function scorePottingEventsIntoBreakState(baseState, events, kindLookup, options = {}) {
          const eventTimeLimit = Number.isFinite(Number(options.eventTimeLimit)) ? Number(options.eventTimeLimit) : Infinity;
          const next = cloneBreakState(baseState);
          const pottedRedIds = new Set(next.pottedBallIds || []);
          const scoredEventKeys = new Set(next.scoredEventKeys || []);
          (events || []).forEach((event) => {
            if (event.type !== "ball-potted") return;
            if (Number(event.t ?? 0) > eventTimeLimit) return;
            const eventKey = [
              event.type,
              event.ballId || "",
              Number(event.t ?? 0).toFixed(4),
              event.pocketId || ""
            ].join(":");
            if (scoredEventKeys.has(eventKey)) return;
            const kind = kindFromLookup(kindLookup, event);
            if (kind === BALL_KIND.RED && event.ballId && pottedRedIds.has(event.ballId)) return;
            const value = ballScoreValue(kind);
            if (!value) return;
            scoredEventKeys.add(eventKey);
            next.scoredEventKeys.push(eventKey);
            if (kind === BALL_KIND.RED && event.ballId) {
              pottedRedIds.add(event.ballId);
              next.pottedBallIds.push(event.ballId);
            }
            next.score += value;
            next.counts[kind] = (next.counts[kind] || 0) + 1;
            next.lastPotKind = kind;
          });
          return next;
        }
        function possibleBreakFromBalls(breakState, balls) {
          const state = cloneBreakState(breakState);
          const tableBalls = (balls || []).filter((ball) => !ball.potted);
          const remainingReds = tableBalls.filter((ball) => ball.kind === BALL_KIND.RED).length;
          const colorClearance = tableBalls.reduce((sum, ball) => ball.kind === BALL_KIND.CUE || ball.kind === BALL_KIND.RED ? sum : sum + ballScoreValue(ball.kind), 0);
          if (remainingReds > 0) {
            const pendingColorAfterRed = state.lastPotKind === BALL_KIND.RED ? ballScoreValue(BALL_KIND.BLACK) : 0;
            return state.score + pendingColorAfterRed + remainingReds * (ballScoreValue(BALL_KIND.RED) + ballScoreValue(BALL_KIND.BLACK)) + 27;
          }
          if (state.lastPotKind === BALL_KIND.RED) return state.score + ballScoreValue(BALL_KIND.BLACK) + colorClearance;
          return state.score + colorClearance;
        }
        return {
          BREAK_SCORE_ORDER,
          ballScoreValue,
          cloneBreakState,
          createBreakCounts,
          createBreakState,
          possibleBreakFromBalls,
          scorePottingEventsIntoBreakState
        };
      });
    }
  });

  // apps/three-game/src/render/hud/breakScoreboardRenderer.js
  var require_breakScoreboardRenderer = __commonJS({
    "apps/three-game/src/render/hud/breakScoreboardRenderer.js"(exports, module) {
      (function installBreakScoreboardRenderer(root, factory) {
        const api = factory(root || {});
        if (typeof module === "object" && module.exports) {
          module.exports = api;
        }
        if (root) {
          root.SnookerBreakScoreboardRenderer = api;
        }
      })(typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : exports, function createBreakScoreboardRenderer(root) {
        const CanvasPrimitives = typeof __require === "function" ? require_canvasPrimitives() : root.SnookerCanvasPrimitives;
        const BreakState = typeof __require === "function" ? require_breakState() : root.SnookerBreakState;
        const { BALL_COLORS } = typeof __require === "function" ? require_ballSpec() : { BALL_COLORS: root.SnookerBallSpec?.BALL_COLORS || {} };
        function drawBreakScoreboard(ctx, rect, model = {}, options = {}) {
          const score = Number(model.score) || 0;
          const threshold = Number.isFinite(Number(options.threshold)) ? Number(options.threshold) : 0;
          if (!options.forceVisible && score <= threshold) return false;
          const ballColors = options.ballColors || BALL_COLORS;
          const counts = BreakState.createBreakCounts(model.counts || {});
          const side = options.side || "none";
          const align = options.align || side;
          const label = options.label || "Break";
          const inline = options.variant === "inline";
          const chipRadius = Number.isFinite(Number(options.chipRadius)) ? Number(options.chipRadius) : Math.max(8, Math.min(14, rect.height * 0.37));
          const chipStep = chipRadius * 2 + (inline ? 4 : 5);
          const visibleKinds = BreakState.BREAK_SCORE_ORDER.filter((kind) => (Number(counts[kind]) || 0) > 0);
          const pottedCount = visibleKinds.reduce((total, kind) => total + (Number(counts[kind]) || 0), 0);
          const inlineLeadWidth = Number(options.inlineLeadWidth) || Math.max(108, rect.height * 4.9);
          const inlineContentWidth = inlineLeadWidth + visibleKinds.length * chipStep;
          const baseX = inline && align === "right" ? Math.max(rect.x, rect.x + rect.width - inlineContentWidth) : rect.x + (inline ? 0 : 10);
          const midY = rect.y + rect.height * 0.5 + 1;
          ctx.save();
          if (!inline) {
            ctx.shadowColor = "rgba(0, 0, 0, 0.35)";
            ctx.shadowBlur = 8;
            ctx.fillStyle = options.background || "#f7f7f3";
            ctx.strokeStyle = options.border || "rgba(17, 24, 31, 0.24)";
            ctx.lineWidth = 1;
            CanvasPrimitives.roundRect(ctx, rect, 2);
            ctx.fill();
            ctx.stroke();
            ctx.shadowBlur = 0;
            ctx.strokeStyle = "rgba(255, 255, 255, 0.55)";
            CanvasPrimitives.roundRect(ctx, {
              x: rect.x + 1,
              y: rect.y + 1,
              width: rect.width - 2,
              height: rect.height - 2
            }, 1);
            ctx.stroke();
          }
          if (options.showIndicator === true && (side === "left" || side === "right")) {
            ctx.fillStyle = options.indicatorColor || "#e0a900";
            ctx.beginPath();
            if (side === "left") {
              ctx.moveTo(rect.x, rect.y + rect.height * 0.5);
              ctx.lineTo(rect.x - 42, rect.y + rect.height * 0.04);
              ctx.lineTo(rect.x - 42, rect.y + rect.height * 0.96);
            } else {
              ctx.moveTo(rect.x + rect.width, rect.y + rect.height * 0.5);
              ctx.lineTo(rect.x + rect.width + 42, rect.y + rect.height * 0.04);
              ctx.lineTo(rect.x + rect.width + 42, rect.y + rect.height * 0.96);
            }
            ctx.closePath();
            ctx.fill();
          }
          ctx.fillStyle = options.textColor || "#111820";
          ctx.textBaseline = "middle";
          ctx.textAlign = "left";
          if (inline) {
            ctx.font = options.labelFont || "650 15px system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
            const labelText = options.showPottedCount === false ? label : `${label} ${score} \xB7 ${pottedCount}\u7403`;
            ctx.fillText(labelText, baseX, midY);
            if (options.showPottedCount === false) {
              const labelGap = Number(options.labelGap) || Math.max(48, rect.height * 1.55);
              ctx.fillStyle = options.scoreColor || options.textColor || "#111820";
              ctx.font = options.scoreFont || "850 24px system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
              ctx.fillText(String(score), baseX + labelGap, midY);
            }
          } else {
            ctx.font = options.labelFont || "450 17px system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
            ctx.fillText(label, baseX, midY);
            ctx.font = options.scoreFont || "850 28px system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
            ctx.fillText(String(score), baseX + 62, midY);
          }
          let chipX = baseX + (inline ? inlineLeadWidth : 116);
          BreakState.BREAK_SCORE_ORDER.forEach((kind) => {
            const count = Number(counts[kind]) || 0;
            if (count <= 0) return;
            const cx = chipX + chipRadius;
            const cy = rect.y + rect.height * 0.5;
            ctx.fillStyle = ballColors[kind] || "#e50012";
            ctx.beginPath();
            ctx.arc(cx, cy, chipRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.save();
            ctx.clip();
            const gradient = ctx.createLinearGradient(cx, cy - chipRadius, cx, cy + chipRadius);
            gradient.addColorStop(0, "rgba(255, 255, 255, 0.34)");
            gradient.addColorStop(0.46, "rgba(255, 255, 255, 0)");
            gradient.addColorStop(1, "rgba(0, 0, 0, 0.22)");
            ctx.fillStyle = gradient;
            ctx.fillRect(chipX, cy - chipRadius, chipRadius * 2, chipRadius * 2);
            ctx.restore();
            ctx.fillStyle = kind === "yellow" ? "#111820" : "#ffffff";
            ctx.font = options.chipFont || "850 15px system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
            ctx.textAlign = "center";
            ctx.shadowColor = kind === "yellow" ? "rgba(255, 255, 255, 0.4)" : "rgba(0, 0, 0, 0.42)";
            ctx.shadowBlur = 2;
            ctx.shadowOffsetY = 1;
            ctx.fillText(String(count), cx, cy + 1);
            ctx.shadowBlur = 0;
            ctx.shadowOffsetY = 0;
            chipX += chipStep;
          });
          ctx.restore();
          return true;
        }
        return {
          drawBreakScoreboard
        };
      });
    }
  });

  // apps/three-game/trial/practice-hud.cjs
  var require_practice_hud = __commonJS({
    "apps/three-game/trial/practice-hud.cjs"(exports, module) {
      var isProduct = () => typeof window !== "undefined" && Boolean(window.SnookerProduct);
      var theme = (legacy, key) => isProduct() ? { fill: "rgba(0,0,0,0.333333)", edge: "rgba(255,255,255,0.219608)", divider: "rgba(255,255,255,0.14902)", text: "#ffffff", active: "rgba(56,91,64,0.466667)", menu: "rgba(21,32,43,0.960784)" }[key] : legacy;
      var Practice = require_practiceMode();
      var { BALL_COLORS } = require_ballSpec();
      var CanvasPrimitives = require_canvasPrimitives();
      var { drawInteractionOverlay, drawToggle, createButton, drawButton } = require_canvasControlsRenderer();
      var BreakScoreboardRenderer = require_breakScoreboardRenderer();
      function drawSideActionButtons(ctx, options = {}) {
        const {
          actions = [],
          buttonMetrics = {},
          fill = "rgba(30, 61, 42, 0.82)",
          hoveredButtonId = null,
          pressedButtonId = null,
          sideRect,
          stroke = "rgba(99, 250, 103, 0.9)",
          text = "#82ff76",
          yOffset = 0
        } = options;
        if (!sideRect || !actions.length) return [];
        const startX = sideRect.x + (sideRect.width - buttonMetrics.width) * 0.5;
        const buttons = [];
        ctx.save();
        actions.forEach((action, index) => {
          const button = createButton(
            action.value || action.id,
            action.label,
            startX,
            sideRect.y + yOffset + index * (buttonMetrics.height + buttonMetrics.gap),
            buttonMetrics.width,
            buttonMetrics.height
          );
          Object.assign(button, action);
          buttons.push(button);
          drawButton(ctx, button, {
            font: `700 ${sideRect.fontSize || 26.4}px system-ui, sans-serif`,
            fill: action.fill || fill,
            hovered: hoveredButtonId === button.id,
            pressed: pressedButtonId === button.id,
            stroke: action.stroke || stroke,
            text: action.text || text
          });
        });
        ctx.restore();
        return buttons;
      }
      var GameOverlayRenderer = { drawSideActionButtons };
      function drawPracticeHud(ctx, options) {
        const { core, layout, menuOpen, difficultyOpen = false, difficultyId = "novice", preview = false, showPickerGlass } = options;
        const shouldPaint = options.shouldPaint || (() => true);
        const state = core.getState, practiceShapes = Practice.PRACTICE_SHAPES, practiceShapeId = core.getPracticeShape, practiceFreePlacementEnabled = core.isFreePlacement, practiceUndoAvailable = core.canRetry, practiceShapeMenuOpen = () => menuOpen;
        const gameInteraction = () => ({}), ui = {};
        const setVisibleLayoutEditorElement = () => {
        };
        const scoreRect = { x: 50, y: 960, width: 1680, height: 100 };
        const gameState = state();
        const gap = Math.max(16, Math.min(24, scoreRect.width * 0.025));
        const placementWidth = Math.max(180, Math.min(210, scoreRect.width * 0.22));
        const selectorWidth = Math.max(250, Math.min(390, scoreRect.width * 0.34));
        const breakWidth = Math.max(
          280,
          Math.min(480, scoreRect.width - selectorWidth - placementWidth - gap * 2)
        );
        const itemHeight = Math.max(58, Math.min(68, scoreRect.height * 0.92));
        const groupWidth = breakWidth + gap + selectorWidth + gap + placementWidth;
        const startX = scoreRect.x + (scoreRect.width - groupWidth) * 0.5;
        const y = scoreRect.y + (scoreRect.height - itemHeight) * 0.5;
        const breakRect = layout.practiceBreakScoreboard;
        const selectorRect = { ...layout.practiceShapeSelector, id: "practice-shape-selector" };
        const placementRect = { ...layout.practiceFreePlacementToggle, id: "practice-free-placement-toggle" };
        const sideRect = layout.practiceResetButton;
        const createSideActionButtonMetrics = () => ({ width: sideRect.width, height: sideRect.height, gap: 0 });
        const getGameHoveredButtonId = () => null, getGamePressedButtonId = () => null;
        ctx.save();
        if (shouldPaint(breakRect)) drawPracticeScore(ctx, breakRect, gameState);
        const shapes = shouldPaint(selectorRect) ? drawPullup(ctx, selectorRect, practiceShapes, practiceShapeId(), menuOpen, "practice-shape", showPickerGlass) : [];
        ui.practiceShapeSelector = selectorRect;
        ui.practiceShapeOptions = shapes.map((r) => ({ ...r, shapeId: r.value }));
        const difficultyRect = { ...layout.practiceDifficultySelector, id: "practice-difficulty-selector" };
        ui.practiceDifficultySelector = difficultyRect;
        ui.practiceDifficultyOptions = shouldPaint(difficultyRect) ? drawPullup(ctx, difficultyRect, DIFFICULTIES, difficultyId, difficultyOpen, "practice-difficulty", showPickerGlass) : [];
        if (shouldPaint(placementRect)) {
          ctx.globalAlpha = placementRect.hidden ? 0 : placementRect.opacity ?? 1;
          ctx.fillStyle = theme(`rgba(3,11,23,${placementRect.backgroundOpacity ?? 0.42})`, "fill");
          ctx.strokeStyle = theme("rgba(211, 154, 76, 0.72)", "edge");
          ctx.lineWidth = 1.2;
          CanvasPrimitives.roundRect(ctx, placementRect, 12);
          ctx.fill();
          ctx.stroke();
          drawInteractionOverlay(ctx, placementRect, {
            ...gameInteraction(placementRect.id),
            radius: 12
          });
          ctx.fillStyle = theme("#f3ead6", "text");
          ctx.font = `700 ${placementRect.fontSize || 26.4}px system-ui, sans-serif`;
          ctx.textAlign = "left";
          ctx.textBaseline = "middle";
          ctx.fillText("\u81EA\u7531\u6446\u7403", placementRect.x + 14, placementRect.y + placementRect.height * 0.5);
          drawToggle(ctx, {
            x: placementRect.x + placementRect.width - 66,
            y: placementRect.y + (placementRect.height - 24) * 0.5,
            width: 52,
            height: 24
          }, practiceFreePlacementEnabled(), gameInteraction(placementRect.id));
        }
        ui.practiceFreePlacementToggle = placementRect;
        ctx.restore();
        ctx.save();
        ctx.globalAlpha = sideRect.hidden ? 0 : sideRect.opacity ?? 1;
        const resetButtons = shouldPaint(sideRect) ? GameOverlayRenderer.drawSideActionButtons(ctx, {
          actions: [{ id: "practice-reset", label: "\u590D\u4F4D\u91CD\u6253" }],
          buttonMetrics: createSideActionButtonMetrics(sideRect),
          fill: theme(`rgba(30,61,42,${sideRect.backgroundOpacity ?? 0.42})`, "fill"),
          hoveredButtonId: getGameHoveredButtonId(),
          pressedButtonId: getGamePressedButtonId(),
          sideRect,
          stroke: theme("rgba(230, 196, 120, 0.9)", "edge"),
          text: theme("#f3ead6", "text")
        }) : [];
        ctx.restore();
        ui.practiceResetButton = resetButtons[0] || null;
        setVisibleLayoutEditorElement("practiceBreakScoreboard", breakRect);
        setVisibleLayoutEditorElement("practiceShapeSelector", selectorRect);
        setVisibleLayoutEditorElement("practiceFreePlacementToggle", placementRect);
        if (ui.practiceResetButton) setVisibleLayoutEditorElement("practiceResetButton", ui.practiceResetButton);
        return ui;
      }
      function drawPracticeScore(ctx, breakRect, gameState) {
        const itemHeight = 68;
        ctx.save();
        ctx.globalAlpha = breakRect.hidden ? 0 : breakRect.opacity ?? 1;
        ctx.fillStyle = theme(`rgba(3,11,23,${breakRect.backgroundOpacity ?? 0.42})`, "fill");
        ctx.strokeStyle = theme("rgba(211, 154, 76, 0.72)", "edge");
        ctx.lineWidth = 1.2;
        CanvasPrimitives.roundRect(ctx, breakRect, 12);
        ctx.fill();
        ctx.stroke();
        if (gameState.practiceStreak) {
          const { current, best } = gameState.practiceStreak;
          ctx.fillStyle = theme("#f3ead6", "text");
          ctx.font = `700 ${breakRect.fontSize || 26.4}px system-ui, sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(`\u5F53\u524D\u8FDE\u8FDB\uFF1A${current}  \uFF5C  \u6700\u9AD8\u8FDE\u8FDB\uFF1A${best}`, breakRect.x + breakRect.width / 2, breakRect.y + breakRect.height / 2, breakRect.width - 24);
          ctx.restore();
          return;
        }
        BreakScoreboardRenderer.drawBreakScoreboard(ctx, {
          x: breakRect.x + 22,
          y: breakRect.y,
          width: breakRect.width - 44,
          height: breakRect.height
        }, {
          score: Number(gameState.players?.[0]?.break) || 0,
          counts: gameState.ruleState?.currentBreakPots || {}
        }, {
          ballColors: BALL_COLORS,
          chipRadius: Math.max(9, itemHeight * 0.22),
          forceVisible: true,
          inlineLeadWidth: Math.max(160, itemHeight * 3.05),
          label: "\u5355\u6746",
          labelFont: `700 ${breakRect.fontSize || 26.4}px system-ui, sans-serif`,
          labelGap: Math.max(78, itemHeight * 1.35),
          scoreColor: "#e1a514",
          scoreFont: `850 ${(breakRect.fontSize || 26.4) * 1.27}px system-ui, sans-serif`,
          showPottedCount: false,
          textColor: "#d9cfb9",
          variant: "inline"
        });
        ctx.restore();
      }
      var DIFFICULTIES = [{ id: "novice", label: "\u65B0\u624B" }, { id: "intermediate", label: "\u8FDB\u9636" }, { id: "professional", label: "\u804C\u4E1A" }, { id: "master", label: "\u5927\u5E08" }, { id: "no-lines", label: "\u65E0\u7EBF" }];
      function drawPullup(ctx, rect, items, value, open, prefix, showPickerGlass) {
        ctx.save();
        ctx.globalAlpha = rect.hidden ? 0 : rect.opacity ?? 1;
        ctx.fillStyle = theme(`rgba(3,11,23,${rect.backgroundOpacity ?? 0.42})`, "fill");
        ctx.strokeStyle = open ? theme("rgba(230,196,120,.96)", "edge") : theme("rgba(211,154,76,.72)", "edge");
        ctx.lineWidth = 1.2;
        CanvasPrimitives.roundRect(ctx, rect, 12);
        ctx.fill();
        ctx.stroke();
        ctx.textBaseline = "middle";
        ctx.textAlign = "left";
        ctx.fillStyle = theme("#f3ead6", "text");
        ctx.font = `700 ${rect.fontSize || 26.4}px system-ui, sans-serif`;
        ctx.fillText((items.find((i) => i.id === value) || items[0]).label, rect.x + 18, rect.y + rect.height / 2);
        ctx.strokeStyle = theme("#e6c478", "text");
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(rect.x + rect.width - 30, rect.y + rect.height * 0.58);
        ctx.lineTo(rect.x + rect.width - 21, rect.y + rect.height * 0.42);
        ctx.lineTo(rect.x + rect.width - 12, rect.y + rect.height * 0.58);
        ctx.stroke();
        const options = [];
        if (open) {
          const rows = [];
          let group = null;
          for (const item of items) {
            if (item.group && item.group !== group) {
              rows.push({ heading: item.group, gap: group ? 0.32 : 0, units: group ? 0.96 : 0.64 });
              group = item.group;
            }
            rows.push({ ...item, units: 1 });
          }
          const totalUnits = rows.reduce((sum, row) => sum + row.units, 0);
          const h = Math.min(rect.height, Math.max(24, (rect.y - 24) / totalUnits));
          const menu = { x: rect.x, y: rect.y - 8 - h * totalUnits, width: rect.width, height: h * totalUnits };
          CanvasPrimitives.roundRect(ctx, menu, 12);
          if (showPickerGlass) showPickerGlass({ ...menu, hidden: rect.hidden, opacity: rect.opacity });
          else {
            ctx.fillStyle = theme("rgba(4,16,25,.9)", "menu");
            ctx.fill();
          }
          ctx.stroke();
          let rowY = menu.y;
          const optionFontSize = Math.min(rect.fontSize || 26.4, h * 0.65);
          rows.forEach((item) => {
            const y = rowY;
            rowY += item.units * h;
            if (item.heading) {
              ctx.save();
              ctx.fillStyle = "#b4b9b4";
              ctx.font = `400 ${optionFontSize * 0.68}px system-ui, sans-serif`;
              if (item.gap) {
                ctx.strokeStyle = theme("rgba(211,154,76,.3)", "divider");
                ctx.beginPath();
                ctx.moveTo(menu.x + 16, y + h * 0.12);
                ctx.lineTo(menu.x + menu.width - 16, y + h * 0.12);
                ctx.stroke();
              }
              ctx.fillText(item.heading, menu.x + 16, y + h * (item.gap + 0.34));
              ctx.restore();
              return;
            }
            const r = { id: prefix + "-" + item.id, popup: true, value: item.id, x: menu.x, y, width: menu.width, height: h };
            options.push(r);
            if (item.id === value) {
              ctx.fillStyle = "rgba(34,104,72,.96)";
              ctx.fillRect(r.x + 2, r.y + 1, r.width - 4, r.height - 2);
            }
            ctx.font = `700 ${optionFontSize}px system-ui, sans-serif`;
            ctx.fillStyle = theme("#f3ead6", "text");
            ctx.fillText(item.label, r.x + (item.group ? 28 : 18), r.y + h / 2);
            if (item.id === value) {
              ctx.textAlign = "right";
              ctx.fillStyle = theme("#e6c478", "text");
              ctx.fillText("\u2713", r.x + r.width - 12, r.y + h / 2);
              ctx.textAlign = "left";
            }
          });
        }
        ctx.restore();
        return options;
      }
      module.exports = { drawPracticeHud, drawPracticeScore, drawPracticeViews, drawPracticeLabel, DIFFICULTIES };
      function drawPracticeLabel(ctx, rect, label) {
        ctx.save();
        ctx.globalAlpha = rect.opacity ?? 1;
        ctx.fillStyle = rect.fill || theme(`rgba(3,11,23,${rect.backgroundOpacity ?? 0.42})`, "fill");
        ctx.strokeStyle = theme("rgba(211,154,76,.72)", "edge");
        ctx.lineWidth = 1.2;
        CanvasPrimitives.roundRect(ctx, rect, 12);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = rect.textColor || theme("#f3ead6", "text");
        ctx.font = `700 ${rect.fontSize || 26.4}px system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(label, rect.x + rect.width / 2, rect.y + rect.height / 2);
        ctx.restore();
      }
      function drawPracticeViews(ctx, group, selected, shouldPaint = () => true) {
        const modes = [["aim", "\u51FB\u7403"], ["camera", "\u89C2\u5BDF"], ["broadcast", "\u76F4\u64AD"], ["god", "\u4E0A\u5E1D"]];
        const targets = modes.map(([mode, label], index) => {
          const r = { ...group, x: group.x + index * group.width / 4, width: group.width / 4, id: "view-" + mode, mode, label };
          if (!shouldPaint(r)) return r;
          ctx.save();
          ctx.globalAlpha = r.hidden ? 0 : r.opacity ?? 1;
          CanvasPrimitives.roundRect(ctx, group, group.cornerRadius ?? 12);
          ctx.clip();
          ctx.fillStyle = selected === mode ? theme(`rgba(30,90,55,${Math.min(1, (group.backgroundOpacity ?? 0.42) + 0.16)})`, "active") : theme(`rgba(3,11,23,${group.backgroundOpacity ?? 0.42})`, "fill");
          ctx.fillRect(r.x, r.y, r.width, r.height);
          ctx.fillStyle = theme("#f3ead6", "text");
          if (group.disabledModes?.includes(mode)) ctx.globalAlpha *= 0.4;
          ctx.font = `700 ${group.fontSize || 26.4}px system-ui, sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(label, r.x + r.width / 2, r.y + r.height / 2);
          if (index) {
            ctx.strokeStyle = theme("rgba(211,154,76,.72)", "edge");
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(r.x, r.y);
            ctx.lineTo(r.x, r.y + r.height);
            ctx.stroke();
          }
          ctx.restore();
          return r;
        });
        ctx.save();
        ctx.globalAlpha = group.hidden ? 0 : group.opacity ?? 1;
        ctx.strokeStyle = theme("rgba(211,154,76,.72)", "edge");
        ctx.lineWidth = 1.2;
        CanvasPrimitives.roundRect(ctx, group, group.cornerRadius ?? 12);
        ctx.stroke();
        ctx.restore();
        return targets;
      }
    }
  });

  // apps/three-game/trial/replay-footer.cjs
  var require_replay_footer = __commonJS({
    "apps/three-game/trial/replay-footer.cjs"(exports, module) {
      var { drawPracticeScore, drawPracticeViews, drawPracticeLabel, DIFFICULTIES } = require_practice_hud();
      var Practice = require_practiceMode();
      function drawReplayFooter(ctx, { core, layout, selected, left, right, bottom, portrait = false }) {
        const status = core.replayStatus();
        const base = layout.practiceBreakScoreboard, style = layout.practiceViewButtons, h = base.height, gap = portrait ? 8 : 16;
        const difficulty = DIFFICULTIES.find((d) => d.id === status?.difficulty)?.label || "\u56DE\u653E";
        const shape = Practice.practiceShapeLabel(core.getPracticeShape());
        function width(label, rect) {
          ctx.font = `700 ${rect.fontSize || 26.4}px system-ui, sans-serif`;
          return Math.ceil(ctx.measureText(label).width) + 36;
        }
        const dw = width(difficulty, layout.practiceDifficultySelector), sw = width(shape, layout.practiceShapeSelector);
        const available = right - left, pw = 3 * h + 2 * gap;
        const cellWidth = Math.min(style.width / 4, portrait ? (available - pw - 2 * gap) / 5 : (available - base.width - dw - sw - pw - 6 * gap) / 6);
        const vw = 4 * cellWidth, y = bottom - h;
        const scoreWidth = portrait ? Math.min(base.width, available - dw - sw - cellWidth - 3 * gap) : base.width;
        const score = { ...base, x: left, y: portrait ? y - h - gap : y, width: scoreWidth, hidden: false };
        const difficultyRect = { ...layout.practiceDifficultySelector, x: left + scoreWidth + gap, y: score.y, width: dw, height: h, hidden: false };
        const shapeRect = { ...layout.practiceShapeSelector, x: difficultyRect.x + dw + gap, y: score.y, width: sw, height: h, hidden: false };
        const group = { ...style, x: portrait ? left : shapeRect.x + sw + gap, y, width: vw, height: h, hidden: false };
        const playerY = y, playerX = group.x + vw + gap;
        drawPracticeScore(ctx, score, core.getState());
        drawPracticeLabel(ctx, difficultyRect, difficulty);
        drawPracticeLabel(ctx, shapeRect, shape);
        const views = drawPracticeViews(ctx, group, selected);
        const share = { ...style, id: "replay-share", action: "share", label: "\u5206\u4EAB\u56DE\u653E", x: portrait ? shapeRect.x + sw + gap : right - 2 * cellWidth - gap, y: portrait ? score.y : y, width: cellWidth, height: h, hidden: false };
        drawPracticeLabel(ctx, share, "\u5206\u4EAB");
        const actions = [["previous", "\u4E0A\u4E00\u6746", !status || status.index === 0], ["pause", status?.ended && globalThis.SnookerProduct ? "\u91CD\u64AD" : status?.paused ? "\u7EE7\u7EED" : "\u6682\u505C", !status || status.ended && !globalThis.SnookerProduct], ["next", "\u4E0B\u4E00\u6746", !status || status.index === status.total - 1]].map(([id, label, disabled], i) => {
          const rect = { ...style, x: playerX + i * (h + gap), y: playerY, width: h, height: h, hidden: false, opacity: disabled ? 0.35 : style.opacity };
          drawPracticeLabel(ctx, rect, "");
          ctx.save();
          ctx.translate(rect.x + h / 2, rect.y + h / 2);
          ctx.scale(h / 68, h / 68);
          ctx.strokeStyle = ctx.fillStyle = "#fff";
          ctx.globalAlpha = disabled ? 0.35 : 1;
          ctx.lineWidth = 3;
          ctx.lineJoin = "round";
          if (globalThis.SnookerProduct?.drawReplayIcon?.(ctx, { id, status })) {
          } else if (id === "pause" && !status?.paused) {
            ctx.fillRect(-10, -13, 6, 26);
            ctx.fillRect(4, -13, 6, 26);
          } else {
            const dir = id === "previous" ? -1 : 1;
            ctx.scale(dir, 1);
            ctx.beginPath();
            ctx.moveTo(-8, -12);
            ctx.lineTo(10, 0);
            ctx.lineTo(-8, 12);
            ctx.closePath();
            ctx.stroke();
            if (id !== "pause") {
              ctx.beginPath();
              ctx.moveTo(14, -13);
              ctx.lineTo(14, 13);
              ctx.stroke();
            }
          }
          ctx.restore();
          return { id: "replay-" + id, action: id, label, disabled, ...rect };
        });
        const exit = { ...style, id: "replay-exit", action: "exit", label: "\u9000\u51FA", x: right - cellWidth, y: playerY, width: cellWidth, height: h, hidden: false, fill: "#e2bf78", textColor: "#13241a" };
        drawPracticeLabel(ctx, exit, "\u9000\u51FA");
        return { score, difficulty: { ...difficultyRect, label: difficulty }, shape: { ...shapeRect, label: shape }, views, actions: [...actions, share, exit], top: score.y };
      }
      module.exports = { drawReplayFooter };
    }
  });

  // apps/three-game/trial/replay-format.cjs
  var require_replay_format = __commonJS({
    "apps/three-game/trial/replay-format.cjs"(exports, module) {
      var { PRACTICE_SHAPES } = require_practiceMode();
      var DIFFICULTIES = ["novice", "intermediate", "professional", "master", "no-lines"];
      var MAX_BYTES = 16 * 1024 * 1024;
      function validateReplay(record, { allowIncomplete = false } = {}) {
        const fail = () => {
          throw new Error("\u56DE\u653E\u6570\u636E\u4E0D\u5B8C\u6574\u6216\u683C\u5F0F\u9519\u8BEF");
        };
        function tree(v, depth = 0) {
          if (depth > 24) fail();
          if (typeof v === "number" && !Number.isFinite(v)) fail();
          if (v && typeof v === "object") for (const key of Object.keys(v)) {
            if (["__proto__", "constructor", "prototype"].includes(key)) fail();
            tree(v[key], depth + 1);
          }
        }
        tree(record);
        if (record?.version !== 1 || typeof record.engineVersion !== "string" || record.engineVersion.length > 80 || !allowIncomplete && !record.completed) fail();
        if (!PRACTICE_SHAPES.some((s) => s.id === record.shapeId) || !Number.isInteger(record.retryCount) || record.retryCount < 0) fail();
        if (!record.physics || Array.isArray(record.physics) || typeof record.physics !== "object") fail();
        if (!Array.isArray(record.shots) || record.shots.length < (allowIncomplete ? 0 : 1) || record.shots.length > 1e3) fail();
        const number = (v, lo, hi) => typeof v === "number" && Number.isFinite(v) && v >= lo && v <= hi;
        function snapshot(s) {
          if (!s || !Array.isArray(s.balls) || s.balls.length < 2 || s.balls.length > 22 || !Array.isArray(s.players) || s.players.length !== 2 || !s.ruleState) fail();
          const ids = /* @__PURE__ */ new Set();
          for (const b of s.balls) {
            if (typeof b.id !== "string" || ids.has(b.id) || !["cue", "red", "yellow", "green", "brown", "blue", "pink", "black"].includes(b.kind) || !number(b.pos?.x, -1e4, 1e4) || !number(b.pos?.y, -1e4, 1e4) || !number(b.radius, 1, 100)) fail();
            ids.add(b.id);
          }
          if (!s.balls.some((b) => b.id === s.cueBallId && b.kind === "cue")) fail();
        }
        for (const item of record.shots) {
          snapshot(item.before);
          snapshot(item.after);
          if (item.placementBefore) {
            snapshot(item.placementBefore);
            if (item.placementBefore.balls.length !== item.before.balls.length || item.before.balls.some((b) => !item.placementBefore.balls.some((p) => p.id === b.id && p.kind === b.kind))) fail();
          }
          if (!DIFFICULTIES.includes(item.difficulty) || !item.aimValues || typeof item.aimValues !== "object") fail();
          const shot = item.shot;
          if (!number(shot?.power, 1e-3, 100) || !number(shot.direction?.x, -1.001, 1.001) || !number(shot.direction?.y, -1.001, 1.001) || Math.hypot(shot.direction.x, shot.direction.y) < 0.99 || !number(shot.tipOffset?.x, -1, 1) || !number(shot.tipOffset?.y, -1, 1) || !number(shot.verticalAngle, 0, 90) || !number(item.duration, 0, 120)) fail();
          if (!item.cuePose || !["origin", "back", "right"].every((k) => Array.isArray(item.cuePose[k]) && item.cuePose[k].length === 3 && item.cuePose[k].every((n) => number(n, -1e4, 1e4)))) fail();
        }
        if (record.streakCount !== void 0 && (!["spot-black", "spot-pink", "random-long"].includes(record.shapeId) || !Number.isSafeInteger(record.streakCount) || record.streakCount < 1 || record.streakCount >= record.shots.length)) fail();
        if (!allowIncomplete && !record.shots.at(-1).after.frameOver) fail();
        return record;
      }
      module.exports = { validateReplay, MAX_BYTES };
    }
  });

  // apps/three-game/trial/replay-history.cjs
  var require_replay_history = __commonJS({
    "apps/three-game/trial/replay-history.cjs"(exports, module) {
      function positionKey(snapshot) {
        const n = (x) => Math.round((Number(x) || 0) * 1e5);
        return JSON.stringify([snapshot.balls.map((b) => [b.id, b.potted, n(b.pos.x), n(b.pos.y)]), snapshot.players.map((p) => [p.score, p.break]), snapshot.ruleState.phase, snapshot.ruleState.targetColorKind, snapshot.ruleState.currentBreakPots]);
      }
      function acceptedReplayShots(record) {
        if (record.historyPolicy === "accepted-shots") return record.shots;
        const accepted = [];
        for (const shot of record.shots) {
          const before = positionKey(shot.before);
          if (accepted.length && positionKey(accepted.at(-1).after) !== before) {
            const previous = accepted.findLastIndex((s) => positionKey(s.before) === before);
            if (previous >= 0) accepted.splice(previous);
          }
          if (!shot.interrupted) accepted.push(shot);
        }
        return accepted;
      }
      module.exports = { acceptedReplayShots, positionKey };
    }
  });

  // apps/three-game/trial/replay-share-dialog.cjs
  var require_replay_share_dialog = __commonJS({
    "apps/three-game/trial/replay-share-dialog.cjs"(exports, module) {
      function createReplayShareDialog() {
        let dialog = null, field = null;
        function close() {
          if (dialog?.open) dialog.close();
        }
        function show(url) {
          if (!dialog) {
            dialog = document.createElement("dialog");
            dialog.className = "practice-replay-dialog replay-share-dialog";
            dialog.setAttribute("aria-labelledby", "replay-share-title");
            dialog.innerHTML = '<h2 id="replay-share-title">\u5206\u4EAB\u56DE\u653E</h2><p>\u81EA\u52A8\u590D\u5236\u672A\u6210\u529F\uFF0C\u8BF7\u957F\u6309\u4E0B\u65B9\u94FE\u63A5\u590D\u5236</p><textarea readonly data-native-copy aria-label="\u56DE\u653E\u94FE\u63A5" rows="3" spellcheck="false" autocapitalize="off"></textarea><div class="replay-dialog-actions"><button type="button">\u5173\u95ED</button></div>';
            field = dialog.querySelector("textarea");
            dialog.querySelector("button").onclick = close;
            document.body.append(dialog);
          }
          field.value = url;
          if (!dialog.open) dialog.showModal();
          dialog.querySelector("button").focus({ preventScroll: true });
        }
        return { show, close, dispose() {
          close();
          dialog?.remove();
          dialog = field = null;
        } };
      }
      module.exports = { createReplayShareDialog };
    }
  });

  // apps/three-game/trial/copy-text.cjs
  var require_copy_text = __commonJS({
    "apps/three-game/trial/copy-text.cjs"(exports, module) {
      "use strict";
      async function copyText(text, parent = document.body, { timeoutMs = 1500 } = {}) {
        let timer;
        try {
          await Promise.race([
            navigator.clipboard.writeText(text),
            new Promise((_, reject) => {
              timer = setTimeout(() => reject(Error("Clipboard timed out")), timeoutMs);
            })
          ]);
          return true;
        } catch {
        } finally {
          clearTimeout(timer);
        }
        const field = document.createElement("textarea");
        field.value = text;
        field.readOnly = true;
        field.setAttribute("data-native-copy", "");
        Object.assign(field.style, { position: "fixed", left: "0", top: "0", opacity: "0" });
        parent.append(field);
        field.select();
        field.setSelectionRange(0, text.length);
        let copied = false;
        try {
          copied = document.execCommand("copy");
        } catch {
        } finally {
          field.remove();
        }
        return copied;
      }
      module.exports = { copyText };
    }
  });

  // apps/three-game/trial/practice-replay-ui.cjs
  var require_practice_replay_ui = __commonJS({
    "apps/three-game/trial/practice-replay-ui.cjs"(exports, module) {
      var { validateReplay } = require_replay_format();
      var { acceptedReplayShots } = require_replay_history();
      var { practiceShapeLabel } = require_practiceMode();
      function createPracticeReplayUI({ core, setView, getView, notice, prepareAudio = async () => true }) {
        const shareDialog = require_replay_share_dialog().createReplayShareDialog();
        let sharing = false, disposed = false;
        const id = new URL(location.href).searchParams.get("replay");
        let watching = id !== null, embedded = false;
        const base = new URL("../", document.baseURI);
        const gameUrl = new URL(location.href);
        gameUrl.search = "";
        gameUrl.hash = "";
        const api = new URL("api/practice-replays", base);
        const presentation = window.SnookerProduct?.createPracticeResultUI?.({ notice });
        const dialog = presentation?.dialog || document.createElement("dialog");
        if (!presentation) dialog.className = "practice-replay-dialog";
        if (!presentation) dialog.setAttribute("aria-labelledby", "practice-replay-title");
        if (!presentation) dialog.innerHTML = '<h2 id="practice-replay-title"></h2><p class="replay-summary"></p><p class="replay-feedback" role="status"></p><div class="replay-dialog-actions"></div>';
        if (!presentation) document.body.append(dialog);
        dialog.addEventListener("cancel", (e) => e.preventDefault());
        const title = presentation?.title || dialog.querySelector("h2"), summary = presentation?.summary || dialog.querySelector(".replay-summary"), feedback = presentation?.feedback || dialog.querySelector(".replay-feedback"), actions = presentation?.actions || dialog.querySelector(".replay-dialog-actions");
        let savedUrl = id ? location.href : "", savePending = false, generation = 0, started = false, preparedRecord = null;
        function button(label, action) {
          const el = document.createElement("button");
          el.type = "button";
          el.textContent = label;
          el.onclick = action;
          actions.append(el);
          presentation?.decorateAction(el, label);
          return el;
        }
        function show(heading, detail = "", modal = true) {
          title.textContent = heading;
          summary.textContent = detail;
          feedback.textContent = "";
          actions.replaceChildren();
          if (!dialog.open) {
            if (modal) dialog.showModal();
            else dialog.show();
          }
        }
        function close() {
          if (dialog.open) dialog.close();
        }
        const copyText = (text) => require_copy_text().copyText(text, dialog.open ? dialog : document.body);
        function complete() {
          const record = core.exportPracticeReplay();
          const best = record ? Math.max(...record.shots.flatMap((s) => [s.before.players[0].break, s.after.players[0].break])) : core.getState().players[0].break;
          const completionGeneration = generation;
          const verification = presentation ? presentation.prepareResult(record) : null;
          const verified = presentation?.pendingResult(record);
          streakCount = record?.streakCount ?? null;
          show(streakCount !== null ? "\u606D\u559C\u4F60\u521B\u9020\u4E2A\u4EBA\u7EAA\u5F55\uFF01" : "\u606D\u559C\u4F60\u5B8C\u6210\u6311\u6218\uFF01", streakCount !== null ? `${practiceShapeLabel(core.getPracticeShape())} \xB7 \u8FDE\u8FDB ${streakCount} \u4E2A` : `\u672C\u5C40\u5355\u6746\u6700\u9AD8\u5206 ${best} \u5206 \xB7 \u91CD\u6253 ${core.retryCount()} \u6B21`);
          const resultData = { record, best, retries: core.retryCount(), shape: core.getPracticeShape(), streak: streakCount };
          presentation?.renderResult(resultData, verified);
          verification?.then((result) => {
            if (completionGeneration === generation && dialog.open) presentation.renderResult(resultData, result);
          });
          button("\u518D\u6B21\u6311\u6218", () => {
            close();
            if (streakCount !== null) {
              core.continueBasicPractice();
              savedUrl = "";
              generation++;
              setView("aim");
              return;
            }
            if (core.loadPracticeShape(core.getPracticeShape())) window.SnookerPracticeAnalytics?.track("challenge_started", { shapeId: core.getPracticeShape() });
            setView("aim");
          });
          const view = button("\u67E5\u770B\u56DE\u653E", async () => {
            if (savePending) return;
            window.SnookerPracticeAnalytics?.track("replay_view_clicked");
            savePending = true;
            view.disabled = true;
            view.textContent = "\u51C6\u5907\u4E2D\u2026";
            feedback.textContent = "";
            const current = generation;
            try {
              if (!record) throw Error("\u6CA1\u6709\u53EF\u67E5\u770B\u7684\u5B8C\u6574\u56DE\u653E");
              if (!savedUrl) {
                const response = await fetch(api, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(record), signal: AbortSignal.timeout(3e4) });
                if (!response.ok) throw Error("\u56DE\u653E\u4FDD\u5B58\u5931\u8D25\uFF0C\u8BF7\u91CD\u8BD5\u3002");
                const result = await response.json();
                if (!/^[a-f0-9]{32}$/.test(result.id)) throw Error("\u56DE\u653E\u4FDD\u5B58\u5931\u8D25\uFF0C\u8BF7\u91CD\u8BD5\u3002");
                if (current !== generation) return;
                const url = new URL(gameUrl);
                url.searchParams.set("replay", result.id);
                savedUrl = url.href;
              }
              await Promise.all([Promise.resolve().then(() => prepareAudio()).catch(() => false), core.preparePracticeReplay(record)]);
              if (current !== generation) return;
              scores = record.shots.flatMap((s) => [s.before.players[0].break, s.after.players[0].break]);
              watching = true;
              embedded = true;
              document.documentElement.dataset.practiceReplay = "true";
              core.loadPracticeReplay(record, { preserveChallenge: true });
              core.seekReplay(0, false);
              setView("broadcast");
              close();
              window.ProductMetrics?.replayView();
            } catch (error) {
              if (current === generation) {
                watching = false;
                embedded = false;
                delete document.documentElement.dataset.practiceReplay;
                feedback.textContent = "\u56DE\u653E\u4FDD\u5B58\u672A\u5B8C\u6210\uFF0C\u8BF7\u5728\u670D\u52A1\u6062\u590D\u540E\u518D\u6B21\u70B9\u51FB\u201C\u67E5\u770B\u56DE\u653E\u201D\u91CD\u8BD5\u3002";
              }
            } finally {
              if (current === generation) {
                savePending = false;
                view.disabled = false;
                view.textContent = "\u67E5\u770B\u56DE\u653E";
              }
            }
          });
          if (presentation) button("\u8FD4\u56DE\u5927\u5385", () => window.ProductNavigation.go("/"));
        }
        function exit() {
          shareDialog.close();
          preparedRecord = null;
          close();
          watching = false;
          delete document.documentElement.dataset.practiceReplay;
          const restored = core.exitPracticeReplay();
          embedded = false;
          if (restored) complete();
          else if (presentation) {
            window.ProductNavigation.go("/");
            return;
          } else {
            history.replaceState(null, "", gameUrl.href);
            savedUrl = "";
          }
          if (document.querySelector("#loading")) window.dispatchEvent(new Event("practice-replay-start-game"));
        }
        function ended() {
          if (presentation) return;
          show("\u56DE\u653E\u5DF2\u7ED3\u675F", streakCount !== null ? `${practiceShapeLabel(core.getPracticeShape())} \xB7 \u8FDE\u8FDB ${streakCount} \u4E2A` : `\u5355\u6746\u6700\u9AD8\u5206 ${Math.max(...scores)} \u5206 \xB7 \u91CD\u6253 ${core.retryCount()} \u6B21`, false);
          button("\u91CD\u65B0\u64AD\u653E", () => {
            close();
            core.seekReplay(0, false);
          });
          button(embedded ? "\u9000\u51FA\u56DE\u653E" : "\u5F00\u59CB\u6E38\u620F", exit);
        }
        let scores = [0], streakCount = null;
        if (watching) document.documentElement.dataset.practiceReplay = "true";
        return {
          get watching() {
            return watching;
          },
          async action(action) {
            if (action === "exit") {
              exit();
              return;
            }
            if (action === "share") {
              if (sharing || !savedUrl) return;
              sharing = true;
              const current = generation;
              window.SnookerPracticeAnalytics?.track("replay_share_clicked");
              const text = streakCount !== null ? `${practiceShapeLabel(core.getPracticeShape())} \xB7 \u8FDE\u8FDB ${streakCount} \u4E2A
\u70B9\u51FB\u67E5\u770B\u56DE\u653E\uFF1A${savedUrl}` : `${practiceShapeLabel(core.getPracticeShape())} \u7403\u578B \u5355\u6746${Math.max(...scores)}\u5206\uFF0C\u70B9\u51FB\u67E5\u770B\u56DE\u653E\uFF1A${savedUrl}`;
              try {
                const copied = await copyText(text);
                if (disposed || current !== generation || !watching) return;
                if (copied) notice("\u56DE\u653E\u94FE\u63A5\u5DF2\u590D\u5236\uFF01");
                else shareDialog.show(savedUrl);
                window.ProductMetrics?.replayShare();
              } finally {
                sharing = false;
              }
              return;
            }
            const s = core.replayStatus();
            if (!s) return;
            if (action === "pause") {
              if (presentation && s.ended) core.seekReplay(0, false);
              else core.togglePause();
              return;
            }
            const index = s.index + (action === "previous" ? -1 : 1);
            if (index >= 0 && index < s.total) {
              close();
              core.seekReplay(index, false);
            }
          },
          async prepare() {
            if (!watching) return true;
            try {
              if (!/^[a-f0-9]{32}$/.test(id)) throw Object.assign(Error("\u56DE\u653E\u94FE\u63A5\u65E0\u6548"), { invalid: true });
              let raw = window.SnookerProduct?.initialPracticeReplay;
              if (raw) delete window.SnookerProduct.initialPracticeReplay;
              else {
                const response = await fetch(new URL(api.href + "/" + id), { signal: AbortSignal.timeout(3e4) });
                if (!response.ok) throw Object.assign(Error(response.status === 404 ? "\u56DE\u653E\u4E0D\u5B58\u5728\u6216\u5DF2\u8D85\u8FC7 30 \u5929\u4FDD\u5B58\u671F\u9650\u3002" : "\u56DE\u653E\u52A0\u8F7D\u5931\u8D25\uFF0C\u8BF7\u5237\u65B0\u91CD\u8BD5"), { expired: response.status === 404 });
                raw = await response.json();
              }
              validateReplay(raw);
              preparedRecord = { ...raw, shots: acceptedReplayShots(raw), historyPolicy: "accepted-shots" };
              streakCount = preparedRecord.streakCount ?? null;
              scores = preparedRecord.shots.flatMap((s) => [s.before.players[0].break, s.after.players[0].break]);
              await Promise.all([Promise.resolve().then(() => prepareAudio()).catch(() => false), core.preparePracticeReplay(preparedRecord)]);
              return true;
            } catch (e) {
              if (presentation?.showReplayError) {
                presentation.showReplayError(e);
                return false;
              }
              show(e.expired ? "\u56DE\u653E\u5DF2\u5931\u6548" : "\u65E0\u6CD5\u64AD\u653E\u56DE\u653E", e.message);
              if (!e.expired) button("\u91CD\u8BD5", () => location.reload());
              button("\u5F00\u59CB\u6E38\u620F", exit);
              return false;
            }
          },
          start() {
            if (!watching || started || !preparedRecord) return;
            try {
              core.loadPracticeReplay(preparedRecord);
              core.seekReplay(0, false);
              preparedRecord = null;
              started = true;
              setView("broadcast");
              window.ProductMetrics?.replayView();
            } catch (e) {
              if (presentation?.showReplayError) {
                presentation.showReplayError(e);
                return;
              }
              show("\u65E0\u6CD5\u64AD\u653E\u56DE\u653E", e.message);
              button("\u5F00\u59CB\u6E38\u620F", exit);
            }
          },
          event(event) {
            if (watching) {
              if (event.type === "replay-ended") ended();
              if (event.type === "replay-seek") close();
              return;
            }
            if (event.type === "reset") {
              shareDialog.close();
              presentation?.reset();
              generation++;
              savePending = false;
              savedUrl = "";
              close();
            }
            if (event.type === "settled" && core.isPractice()) {
              if (core.getState().frameOver) complete();
            }
          },
          update() {
          },
          dispose() {
            disposed = true;
            shareDialog.dispose();
            preparedRecord = null;
            close();
            dialog.remove();
          }
        };
      }
      module.exports = { createPracticeReplayUI };
    }
  });

  // apps/three-game/trial/device-preferences.cjs
  var require_device_preferences = __commonJS({
    "apps/three-game/trial/device-preferences.cjs"(exports, module) {
      var KEY = "snooker.3d.device-settings.v1";
      var DEFAULTS = Object.freeze({ graphicsQuality: "ultra", maxFrameRate: 0, gameVolume: 1, backgroundAudioEnabled: true, scoreVoiceMode: "en", peekFreeMaxZoom: 1.5, cueBallRedDotsEnabled: true, clickAimEnabled: true, operationLayout: null });
      function deviceType(nav) {
        return nav.userAgentData?.mobile || /Android|iPhone|iPad|iPod|Mobile/i.test(nav.userAgent || "") || /Macintosh/i.test(nav.userAgent || "") && nav.maxTouchPoints > 1 ? "mobile" : "desktop";
      }
      function sanitize(values = {}) {
        const finite = (key, min, max, step) => {
          const n = Number(values[key]);
          return Number.isFinite(n) ? Math.round(Math.max(min, Math.min(max, n)) / step) * step : DEFAULTS[key];
        };
        return {
          graphicsQuality: ["smooth", "high", "ultra"].includes(values.graphicsQuality) ? values.graphicsQuality : DEFAULTS.graphicsQuality,
          maxFrameRate: [0, 60, 90, 120].includes(values.maxFrameRate) ? values.maxFrameRate : values.maxFrameRate === 30 ? 60 : DEFAULTS.maxFrameRate,
          gameVolume: +finite("gameVolume", 0, 3, 0.01).toFixed(2),
          scoreVoiceMode: ["zh", "en", "off"].includes(values.scoreVoiceMode) ? values.scoreVoiceMode : DEFAULTS.scoreVoiceMode,
          backgroundAudioEnabled: typeof values.backgroundAudioEnabled === "boolean" ? values.backgroundAudioEnabled : true,
          cueBallRedDotsEnabled: typeof values.cueBallRedDotsEnabled === "boolean" ? values.cueBallRedDotsEnabled : DEFAULTS.cueBallRedDotsEnabled,
          clickAimEnabled: typeof values.clickAimEnabled === "boolean" ? values.clickAimEnabled : DEFAULTS.clickAimEnabled,
          operationLayout: ["desktop", "mobile"].includes(values.operationLayout) ? values.operationLayout : DEFAULTS.operationLayout,
          peekFreeMaxZoom: +finite("peekFreeMaxZoom", 1, 2, 0.1).toFixed(1)
        };
      }
      function createStore(storage) {
        let current = { ...DEFAULTS }, lastSaved;
        function sync() {
          try {
            const saved = storage?.getItem(KEY) ?? null;
            if (saved === lastSaved) return;
            lastSaved = saved;
            current = sanitize(JSON.parse(saved || "{}"));
          } catch {
          }
        }
        return { read() {
          sync();
          return { ...current };
        }, set(key, value) {
          if (!Object.hasOwn(DEFAULTS, key)) throw Error("\u672A\u77E5\u8BBE\u5907\u8BBE\u7F6E");
          sync();
          current = sanitize({ ...current, [key]: value });
          let persisted = false;
          try {
            if (storage) {
              const saved = JSON.stringify(current);
              storage.setItem(KEY, saved);
              lastSaved = saved;
              persisted = true;
            }
          } catch {
          }
          return { values: { ...current }, persisted };
        } };
      }
      var store;
      function deviceStore() {
        if (!store) {
          let storage;
          try {
            storage = globalThis.localStorage;
          } catch {
          }
          store = createStore(storage);
        }
        return store;
      }
      function read() {
        return deviceStore().read();
      }
      function set(key, value) {
        const result = deviceStore().set(key, value);
        if (typeof window !== "undefined") {
          if (key === "operationLayout") window.dispatchEvent(new CustomEvent("operation-layout-change", { detail: result.values.operationLayout }));
          else window.dispatchEvent(new CustomEvent("practice-settings-change", { detail: result.values }));
        }
        return result;
      }
      module.exports = { KEY, DEFAULTS, createStore, read, set, deviceType, focusZoom: () => read().peekFreeMaxZoom };
    }
  });

  // assets/three-trial/tuning-snapshot.json
  var require_tuning_snapshot = __commonJS({
    "assets/three-trial/tuning-snapshot.json"(exports, module) {
      module.exports = {
        source: "apps/three-game/config/test-field-presets.json",
        copiedAt: "2026-10-21T07:23:28.719Z",
        presets: {
          aim: {
            id: "cc3392d7-768d-4fab-93c5-012340488e9f",
            revisionId: "ac087459-02f2-4979-9d7a-7392c31c8998",
            kind: "aim",
            name: "3D-v2",
            savedAt: 1792381627891,
            values: {
              difficultyVersion: 1,
              activeDifficulty: "professional",
              difficultyProfiles: {
                novice: {
                  peekFreeMaxZoom: 1.5,
                  peekTargetLiftCm: 20,
                  peekTargetLowerCm: 0,
                  peekTargetForwardCm: 0,
                  peekFreeLiftCm: 0,
                  peekFreeLowerCm: 20,
                  peekFreeForwardCm: 40,
                  peekTargetAngleRatio: 0.3333333333333333,
                  peekTargetLateralCm: 40,
                  peekFreeAngleDeg: 0,
                  powerTrackContainerAlpha: 0.35,
                  powerTrackCueAlpha: 0.8,
                  observationAimEnabled: true,
                  broadcastAimEnabled: true,
                  godAimEnabled: true,
                  reboundMode: "line",
                  reboundLineWidthMm: 8,
                  cueBallReboundEnabled: true,
                  reboundEnabled: true,
                  reboundMinLengthMm: 240,
                  reboundMaxLengthMm: 400,
                  reboundMinAngleDeg: 5,
                  reboundMaxAngleDeg: 5,
                  reboundDistanceMm: 5e3,
                  reboundDistanceInfluence: 0.45,
                  reboundAngleInfluence: 0.6,
                  reboundSpinInfluence: 0.5,
                  reboundStartWidthMm: 10,
                  reboundColor: "#86cfff",
                  reboundAlpha: 0.8,
                  cueLineMode: "line",
                  cueLineBlurMaxLengthMm: 1e3,
                  cueLineBlurCushionPenalty: 0.5,
                  cueLineBlurBackSnookerPenalty: 0.5,
                  cueLineBlurStartAlpha: 0.7,
                  cueLineBlurEndAlpha: 0,
                  cueLineColor: "#ffffff",
                  cueLineAlpha: 0.7,
                  cueLineWidthMm: 5,
                  cueBallCutAngleCurvePower: 1,
                  cueBallDistanceCurvePower: 1,
                  distanceLengthInfluence: 1,
                  distanceAngleInfluence: 0.2,
                  cutLengthInfluence: 1,
                  cutAngleInfluence: 1,
                  objectMode: "line",
                  objectMaxDistanceMm: 4e3,
                  objectLineMinLengthMm: 700,
                  objectLineMaxLengthMm: 1400,
                  objectLineWidthMm: 8,
                  objectConeMinLengthMm: 225,
                  objectConeMaxLengthMm: 800,
                  objectConeMinAngleDeg: 1,
                  objectConeMaxAngleDeg: 30,
                  objectConeStartWidthMm: 5,
                  objectColor: "#00f900",
                  objectAlpha: 0.8,
                  cueBallMode: "line",
                  cueBallLineMinLengthMm: 300,
                  cueBallLineMaxLengthMm: 800,
                  cueBallLineWidthMm: 8,
                  cueBallConeMinLengthMm: 150,
                  cueBallConeMaxLengthMm: 500,
                  cueBallConeMinAngleDeg: 1,
                  cueBallConeMaxAngleDeg: 15,
                  cueBallConeStartWidthMm: 5,
                  cueBallColor: "#f5f5ee",
                  cueBallAlpha: 0.8,
                  cueBallRedOverlayEnabled: true,
                  cueBallRedColor: "#ff3b30",
                  cueBallRedAlpha: 0.8,
                  ghostBallTailEnabled: false,
                  ghostBallTailWidthMm: 3,
                  ghostBallTailColor: "#ffffff",
                  ghostBallTailAlpha: 0.9,
                  ghostBallLineWidthMm: 4,
                  ghostBallStrokeColor: "#ffffff",
                  ghostBallStrokeAlpha: 0.92,
                  ghostBallFillColor: "#ffffff",
                  ghostBallFillAlpha: 0.5,
                  cushionAccuracyInfluenceStrength: 1,
                  cushionAccuracyStartDistanceMm: 120,
                  cueBallCushionAccuracyLengthPenaltyRatio: 0.5,
                  cueBallCushionAccuracyConeAngleBoostDeg: 22.5,
                  cushionTargetLengthInfluence: 0.5,
                  cushionTargetAngleInfluence: 0.75,
                  cushionTangentNoEffectAngleDeg: 10,
                  backSnookerAccuracyInfluenceStrength: 1,
                  backSnookerDetectionDistanceMm: 300,
                  cueBallBackSnookerAccuracyLengthPenaltyRatio: 0.5,
                  cueBallBackSnookerAccuracyConeAngleBoostDeg: 22.5,
                  backSnookerTargetLengthInfluence: 0.8,
                  backSnookerTargetAngleInfluence: 1
                },
                intermediate: {
                  peekFreeMaxZoom: 1.5,
                  peekTargetLiftCm: 20,
                  peekTargetLowerCm: 0,
                  peekTargetForwardCm: 0,
                  peekFreeLiftCm: 0,
                  peekFreeLowerCm: 20,
                  peekFreeForwardCm: 40,
                  peekTargetAngleRatio: 0.3333333333333333,
                  peekTargetLateralCm: 40,
                  peekFreeAngleDeg: 0,
                  powerTrackContainerAlpha: 0.35,
                  powerTrackCueAlpha: 0.8,
                  observationAimEnabled: false,
                  broadcastAimEnabled: true,
                  godAimEnabled: true,
                  reboundMode: "cone",
                  reboundLineWidthMm: 4,
                  cueBallReboundEnabled: true,
                  reboundEnabled: true,
                  reboundMinLengthMm: 150,
                  reboundMaxLengthMm: 240,
                  reboundMinAngleDeg: 10,
                  reboundMaxAngleDeg: 20,
                  reboundDistanceMm: 3650,
                  reboundDistanceInfluence: 0.5,
                  reboundAngleInfluence: 0.6,
                  reboundSpinInfluence: 0.5,
                  reboundStartWidthMm: 10,
                  reboundColor: "#86cfff",
                  reboundAlpha: 0.65,
                  cueLineMode: "line",
                  cueLineBlurMaxLengthMm: 1e3,
                  cueLineBlurCushionPenalty: 0.5,
                  cueLineBlurBackSnookerPenalty: 0.5,
                  cueLineBlurStartAlpha: 0.7,
                  cueLineBlurEndAlpha: 0,
                  cueLineColor: "#ffffff",
                  cueLineAlpha: 0.7,
                  cueLineWidthMm: 5,
                  cueBallCutAngleCurvePower: 1,
                  cueBallDistanceCurvePower: 1,
                  distanceLengthInfluence: 1,
                  distanceAngleInfluence: 0.2,
                  cutLengthInfluence: 1,
                  cutAngleInfluence: 1,
                  objectMode: "cone",
                  objectMaxDistanceMm: 4e3,
                  objectLineMinLengthMm: 0,
                  objectLineMaxLengthMm: 600,
                  objectLineWidthMm: 8,
                  objectConeMinLengthMm: 500,
                  objectConeMaxLengthMm: 1e3,
                  objectConeMinAngleDeg: 1,
                  objectConeMaxAngleDeg: 20,
                  objectConeStartWidthMm: 5,
                  objectColor: "#35e96d",
                  objectAlpha: 0.9,
                  cueBallMode: "cone",
                  cueBallLineMinLengthMm: 25,
                  cueBallLineMaxLengthMm: 850,
                  cueBallLineWidthMm: 5,
                  cueBallConeMinLengthMm: 250,
                  cueBallConeMaxLengthMm: 500,
                  cueBallConeMinAngleDeg: 1,
                  cueBallConeMaxAngleDeg: 10,
                  cueBallConeStartWidthMm: 5,
                  cueBallColor: "#f5f5ee",
                  cueBallAlpha: 0.8,
                  cueBallRedOverlayEnabled: true,
                  cueBallRedColor: "#ff3b30",
                  cueBallRedAlpha: 0.8,
                  ghostBallTailEnabled: false,
                  ghostBallTailWidthMm: 3,
                  ghostBallTailColor: "#ffffff",
                  ghostBallTailAlpha: 0.9,
                  ghostBallLineWidthMm: 4,
                  ghostBallStrokeColor: "#ffffff",
                  ghostBallStrokeAlpha: 0.92,
                  ghostBallFillColor: "#ffffff",
                  ghostBallFillAlpha: 0.5,
                  cushionAccuracyInfluenceStrength: 1,
                  cushionAccuracyStartDistanceMm: 120,
                  cueBallCushionAccuracyLengthPenaltyRatio: 0.5,
                  cueBallCushionAccuracyConeAngleBoostDeg: 22.5,
                  cushionTargetLengthInfluence: 0.5,
                  cushionTargetAngleInfluence: 0.75,
                  cushionTangentNoEffectAngleDeg: 10,
                  backSnookerAccuracyInfluenceStrength: 1,
                  backSnookerDetectionDistanceMm: 300,
                  cueBallBackSnookerAccuracyLengthPenaltyRatio: 0.5,
                  cueBallBackSnookerAccuracyConeAngleBoostDeg: 22.5,
                  backSnookerTargetLengthInfluence: 0.8,
                  backSnookerTargetAngleInfluence: 1
                },
                professional: {
                  peekFreeMaxZoom: 1.5,
                  peekTargetLiftCm: 20,
                  peekTargetLowerCm: 0,
                  peekTargetForwardCm: 0,
                  peekFreeLiftCm: 0,
                  peekFreeLowerCm: 20,
                  peekFreeForwardCm: 0,
                  peekTargetAngleRatio: 0.3333333333333333,
                  peekTargetLateralCm: 40,
                  peekFreeAngleDeg: 0,
                  powerTrackContainerAlpha: 0.35,
                  powerTrackCueAlpha: 0.8,
                  observationAimEnabled: false,
                  broadcastAimEnabled: true,
                  godAimEnabled: false,
                  reboundMode: "cone",
                  reboundLineWidthMm: 4,
                  cueBallReboundEnabled: false,
                  reboundEnabled: true,
                  reboundMinLengthMm: 150,
                  reboundMaxLengthMm: 240,
                  reboundMinAngleDeg: 10,
                  reboundMaxAngleDeg: 20,
                  reboundDistanceMm: 3650,
                  reboundDistanceInfluence: 0.5,
                  reboundAngleInfluence: 0.6,
                  reboundSpinInfluence: 0.5,
                  reboundStartWidthMm: 10,
                  reboundColor: "#86cfff",
                  reboundAlpha: 0.65,
                  cueLineMode: "blur",
                  cueLineBlurMaxLengthMm: 1850,
                  cueLineBlurCushionPenalty: 0.3,
                  cueLineBlurBackSnookerPenalty: 0.5,
                  cueLineBlurStartAlpha: 0.7,
                  cueLineBlurEndAlpha: 0.05,
                  cueLineColor: "#ffffff",
                  cueLineAlpha: 0.7,
                  cueLineWidthMm: 5,
                  cueBallCutAngleCurvePower: 1,
                  cueBallDistanceCurvePower: 1,
                  distanceLengthInfluence: 1,
                  distanceAngleInfluence: 0.2,
                  cutLengthInfluence: 1,
                  cutAngleInfluence: 1,
                  objectMode: "cone",
                  objectMaxDistanceMm: 4e3,
                  objectLineMinLengthMm: 0,
                  objectLineMaxLengthMm: 600,
                  objectLineWidthMm: 8,
                  objectConeMinLengthMm: 350,
                  objectConeMaxLengthMm: 700,
                  objectConeMinAngleDeg: 1,
                  objectConeMaxAngleDeg: 30,
                  objectConeStartWidthMm: 5,
                  objectColor: "#35e96d",
                  objectAlpha: 0.9,
                  cueBallMode: "cone",
                  cueBallLineMinLengthMm: 25,
                  cueBallLineMaxLengthMm: 850,
                  cueBallLineWidthMm: 5,
                  cueBallConeMinLengthMm: 200,
                  cueBallConeMaxLengthMm: 400,
                  cueBallConeMinAngleDeg: 1,
                  cueBallConeMaxAngleDeg: 15,
                  cueBallConeStartWidthMm: 5,
                  cueBallColor: "#f5f5ee",
                  cueBallAlpha: 0.8,
                  cueBallRedOverlayEnabled: true,
                  cueBallRedColor: "#ff3b30",
                  cueBallRedAlpha: 0.8,
                  ghostBallTailEnabled: false,
                  ghostBallTailWidthMm: 3,
                  ghostBallTailColor: "#ffffff",
                  ghostBallTailAlpha: 0.9,
                  ghostBallLineWidthMm: 4,
                  ghostBallStrokeColor: "#ffffff",
                  ghostBallStrokeAlpha: 0.92,
                  ghostBallFillColor: "#ffffff",
                  ghostBallFillAlpha: 0.5,
                  cushionAccuracyInfluenceStrength: 1,
                  cushionAccuracyStartDistanceMm: 120,
                  cueBallCushionAccuracyLengthPenaltyRatio: 0.5,
                  cueBallCushionAccuracyConeAngleBoostDeg: 22.5,
                  cushionTargetLengthInfluence: 0.5,
                  cushionTargetAngleInfluence: 0.75,
                  cushionTangentNoEffectAngleDeg: 10,
                  backSnookerAccuracyInfluenceStrength: 1,
                  backSnookerDetectionDistanceMm: 300,
                  cueBallBackSnookerAccuracyLengthPenaltyRatio: 0.5,
                  cueBallBackSnookerAccuracyConeAngleBoostDeg: 22.5,
                  backSnookerTargetLengthInfluence: 0.8,
                  backSnookerTargetAngleInfluence: 1
                },
                master: {
                  peekFreeMaxZoom: 1.5,
                  peekTargetLiftCm: 20,
                  peekTargetLowerCm: 0,
                  peekTargetForwardCm: 0,
                  peekFreeLiftCm: 0,
                  peekFreeLowerCm: 20,
                  peekFreeForwardCm: 0,
                  peekTargetAngleRatio: 0.3333333333333333,
                  peekTargetLateralCm: 40,
                  peekFreeAngleDeg: 0,
                  powerTrackContainerAlpha: 0.35,
                  powerTrackCueAlpha: 0.8,
                  observationAimEnabled: false,
                  broadcastAimEnabled: false,
                  godAimEnabled: false,
                  reboundMode: "cone",
                  reboundLineWidthMm: 4,
                  cueBallReboundEnabled: false,
                  reboundEnabled: false,
                  reboundMinLengthMm: 150,
                  reboundMaxLengthMm: 240,
                  reboundMinAngleDeg: 10,
                  reboundMaxAngleDeg: 20,
                  reboundDistanceMm: 3650,
                  reboundDistanceInfluence: 0.5,
                  reboundAngleInfluence: 0.6,
                  reboundSpinInfluence: 0.5,
                  reboundStartWidthMm: 10,
                  reboundColor: "#86cfff",
                  reboundAlpha: 0.65,
                  cueLineMode: "blur",
                  cueLineBlurMaxLengthMm: 1400,
                  cueLineBlurCushionPenalty: 0.3,
                  cueLineBlurBackSnookerPenalty: 0.5,
                  cueLineBlurStartAlpha: 0.7,
                  cueLineBlurEndAlpha: 0.05,
                  cueLineColor: "#ffffff",
                  cueLineAlpha: 0.7,
                  cueLineWidthMm: 5,
                  cueBallCutAngleCurvePower: 1,
                  cueBallDistanceCurvePower: 1,
                  distanceLengthInfluence: 1,
                  distanceAngleInfluence: 0.2,
                  cutLengthInfluence: 1,
                  cutAngleInfluence: 1,
                  objectMode: "cone",
                  objectMaxDistanceMm: 2e3,
                  objectLineMinLengthMm: 0,
                  objectLineMaxLengthMm: 600,
                  objectLineWidthMm: 8,
                  objectConeMinLengthMm: 300,
                  objectConeMaxLengthMm: 600,
                  objectConeMinAngleDeg: 1,
                  objectConeMaxAngleDeg: 40,
                  objectConeStartWidthMm: 5,
                  objectColor: "#35e96d",
                  objectAlpha: 0.9,
                  cueBallMode: "cone",
                  cueBallLineMinLengthMm: 25,
                  cueBallLineMaxLengthMm: 850,
                  cueBallLineWidthMm: 5,
                  cueBallConeMinLengthMm: 150,
                  cueBallConeMaxLengthMm: 300,
                  cueBallConeMinAngleDeg: 1,
                  cueBallConeMaxAngleDeg: 20,
                  cueBallConeStartWidthMm: 5,
                  cueBallColor: "#f5f5ee",
                  cueBallAlpha: 0.8,
                  cueBallRedOverlayEnabled: true,
                  cueBallRedColor: "#ff3b30",
                  cueBallRedAlpha: 0.8,
                  ghostBallTailEnabled: false,
                  ghostBallTailWidthMm: 3,
                  ghostBallTailColor: "#ffffff",
                  ghostBallTailAlpha: 0.9,
                  ghostBallLineWidthMm: 4,
                  ghostBallStrokeColor: "#ffffff",
                  ghostBallStrokeAlpha: 0.92,
                  ghostBallFillColor: "#ffffff",
                  ghostBallFillAlpha: 0.5,
                  cushionAccuracyInfluenceStrength: 1,
                  cushionAccuracyStartDistanceMm: 120,
                  cueBallCushionAccuracyLengthPenaltyRatio: 0.5,
                  cueBallCushionAccuracyConeAngleBoostDeg: 22.5,
                  cushionTargetLengthInfluence: 0.5,
                  cushionTargetAngleInfluence: 0.75,
                  cushionTangentNoEffectAngleDeg: 10,
                  backSnookerAccuracyInfluenceStrength: 1,
                  backSnookerDetectionDistanceMm: 300,
                  cueBallBackSnookerAccuracyLengthPenaltyRatio: 0.5,
                  cueBallBackSnookerAccuracyConeAngleBoostDeg: 22.5,
                  backSnookerTargetLengthInfluence: 0.8,
                  backSnookerTargetAngleInfluence: 1
                },
                "no-lines": {
                  peekFreeMaxZoom: 1.5,
                  peekTargetLiftCm: 20,
                  peekTargetLowerCm: 0,
                  peekTargetForwardCm: 0,
                  peekFreeLiftCm: 0,
                  peekFreeLowerCm: 25,
                  peekFreeForwardCm: 0,
                  peekTargetAngleRatio: 0.3333333333333333,
                  peekTargetLateralCm: 40,
                  peekFreeAngleDeg: 0,
                  powerTrackContainerAlpha: 0.28,
                  powerTrackCueAlpha: 1,
                  observationAimEnabled: true,
                  broadcastAimEnabled: true,
                  godAimEnabled: true,
                  reboundMode: "cone",
                  reboundLineWidthMm: 4,
                  cueBallReboundEnabled: false,
                  reboundEnabled: false,
                  reboundMinLengthMm: 150,
                  reboundMaxLengthMm: 350,
                  reboundMinAngleDeg: 12,
                  reboundMaxAngleDeg: 30,
                  reboundDistanceMm: 3650,
                  reboundDistanceInfluence: 0.5,
                  reboundAngleInfluence: 0.6,
                  reboundSpinInfluence: 0.5,
                  reboundStartWidthMm: 10,
                  reboundColor: "#86cfff",
                  reboundAlpha: 0.55,
                  cueLineMode: "line",
                  cueLineBlurMaxLengthMm: 1e3,
                  cueLineBlurCushionPenalty: 0.5,
                  cueLineBlurBackSnookerPenalty: 0.5,
                  cueLineBlurStartAlpha: 0.7,
                  cueLineBlurEndAlpha: 0,
                  cueLineColor: "#ffffff",
                  cueLineAlpha: 0.7,
                  cueLineWidthMm: 8,
                  cueBallCutAngleCurvePower: 1,
                  cueBallDistanceCurvePower: 1,
                  distanceLengthInfluence: 1,
                  distanceAngleInfluence: 0.3,
                  cutLengthInfluence: 0.8,
                  cutAngleInfluence: 1,
                  objectMode: "cone",
                  objectMaxDistanceMm: 3650,
                  objectLineMinLengthMm: 0,
                  objectLineMaxLengthMm: 600,
                  objectLineWidthMm: 8,
                  objectConeMinLengthMm: 0,
                  objectConeMaxLengthMm: 900,
                  objectConeMinAngleDeg: 1,
                  objectConeMaxAngleDeg: 45,
                  objectConeStartWidthMm: 10,
                  objectColor: "#35e96d",
                  objectAlpha: 0.9,
                  cueBallMode: "cone",
                  cueBallLineMinLengthMm: 25,
                  cueBallLineMaxLengthMm: 850,
                  cueBallLineWidthMm: 5,
                  cueBallConeMinLengthMm: 150,
                  cueBallConeMaxLengthMm: 500,
                  cueBallConeMinAngleDeg: 1,
                  cueBallConeMaxAngleDeg: 20,
                  cueBallConeStartWidthMm: 10,
                  cueBallColor: "#f5f5ee",
                  cueBallAlpha: 0.8,
                  cueBallRedOverlayEnabled: true,
                  cueBallRedColor: "#ff3b30",
                  cueBallRedAlpha: 0.8,
                  ghostBallTailEnabled: false,
                  ghostBallTailWidthMm: 3,
                  ghostBallTailColor: "#ffffff",
                  ghostBallTailAlpha: 0.9,
                  ghostBallLineWidthMm: 4,
                  ghostBallStrokeColor: "#ffffff",
                  ghostBallStrokeAlpha: 0.92,
                  ghostBallFillColor: "#ffffff",
                  ghostBallFillAlpha: 0.5,
                  cushionAccuracyInfluenceStrength: 1,
                  cushionAccuracyStartDistanceMm: 120,
                  cueBallCushionAccuracyLengthPenaltyRatio: 0.5,
                  cueBallCushionAccuracyConeAngleBoostDeg: 22.5,
                  cushionTargetLengthInfluence: 0.5,
                  cushionTargetAngleInfluence: 0.75,
                  cushionTangentNoEffectAngleDeg: 10,
                  backSnookerAccuracyInfluenceStrength: 1,
                  backSnookerDetectionDistanceMm: 300,
                  cueBallBackSnookerAccuracyLengthPenaltyRatio: 0.5,
                  cueBallBackSnookerAccuracyConeAngleBoostDeg: 22.5,
                  backSnookerTargetLengthInfluence: 0.8,
                  backSnookerTargetAngleInfluence: 1
                }
              }
            }
          },
          physics: {
            id: "2b6704d8-0274-4480-baa7-1c21d6a647a6",
            revisionId: "a78bfb2f-9895-447c-a6e3-23dead08aad1",
            kind: "physics",
            name: "V1",
            savedAt: 1792567130014,
            values: {
              maxCueElevationDeg: 20,
              maxCenterBallSpeedMmS: 7e3,
              maxTipOffsetRatio: 0.5,
              maxTipSpeedRetention: 0.85,
              cueSpinEfficiency: 0.8,
              gravityMmS2: 9810,
              clothSlidingMu: 0.17,
              clothRollingDecelMmS2: 125,
              clothSideSpinDecelRadS2: 18,
              ballNormalRestitution: 1,
              ballContactFrictionMu: 0,
              cushionContactFrictionMu: 0.17,
              cushionNoseHeightRadiusRatio: 1.1,
              cushionEnergeticRestitution: 0.9,
              cushionSpeedCorrectionStrength: 1,
              cushionResponseMode: "current",
              cushionEmpiricalStunRoll: 0.25,
              cushionEmpiricalSpinLimit: 1.4,
              cushionEmpiricalSpinSpeed: 0.055,
              cushionEmpiricalLowRetention: 0.9,
              cushionEmpiricalHighRetention: 0.8,
              cushionSpinCorrectionStrength: 0.32,
              cushionImpulseSteps: 64,
              physicsVersion: "SM"
            }
          },
          lighting: {
            id: "99412025-e523-475f-86a4-3bb6d4355186",
            revisionId: "5d09da47-732a-4250-841a-4d92609d11e8",
            kind: "lighting",
            name: "V1",
            savedAt: 1794043698249,
            values: {
              roofLength: 5,
              roofWidth: 0.8,
              roofHeight: 3,
              shadowOpacity: 1,
              shadowSize: 0.8,
              shadowOffsetStrength: 0.5,
              shadowInnerStrength: 0.75,
              shadowOuterStrength: 0.35,
              shadowInnerRadius: 0.5,
              shadowOuterRadius: 0.67,
              shadowInnerBlur: 0.35,
              shadowOuterBlur: 0.34,
              whiteWarmth: 0.5,
              shadowEnabled: true,
              colorReflection: 1.6,
              whiteReflection: 1.6,
              pocketBrightness: 2.36,
              mainAmount: 1.15,
              aoStrength: 1,
              fresnelAmount: 0,
              fresnelFocus: 0.22,
              roughness: 0,
              ambientIntensity: 2,
              ambientColor: "#b9b9b9",
              floorMaterial: "woolV2",
              railBase: 1,
              railReflection: 1,
              railEdge: 1,
              railFocus: 1,
              baizeRoughness: 0.95,
              baizeSoftReflection: 1,
              baizeBase: 1.1,
              baizeEdge: 1,
              baizeFocus: 1,
              baizeDetail: 1,
              baizeWeaveScale: 0.5,
              cushionSurfaceRoughness: 0.95,
              cushionSurfaceSoftReflection: 0.35,
              cushionSurfaceBase: 1,
              cushionSurfaceEdge: 1,
              cushionSurfaceFocus: 1,
              cushionSurfaceDetail: 1,
              cushionSurfaceWeaveScale: 0.5,
              floorSurfaceBase: 1,
              floorSurfaceReflection: 1,
              floorSurfaceEdge: 1,
              floorSurfaceFocus: 1,
              floorSurfaceDetail: 1,
              floorSurfaceScale: 1,
              leatherReflection: 1,
              leatherRoughness: 0.38,
              legReflection: 1,
              legRoughness: 0.32,
              floorBakedLight: 1,
              cueDiffuseTop: 0.85,
              cueDiffuseFill: 0,
              cueReflection: 3,
              cueRoughness: 0.75,
              cueRoomEdge: 1,
              cueRoomFocus: 1,
              cueBaseLight: 0.5,
              cueBrassReflection: 1.15,
              cueBrassRoughness: 0.19,
              cueShadowEnabled: true,
              cueShadowOpacity: 0.42,
              cueShadowSoftness: 1,
              cueShadowHeightFade: 4,
              broadcastHeight: 3.3809460939255955,
              broadcastElevation: 25
            }
          },
          scene: {
            id: "ac787b10-f98b-4f28-830a-7e80c0e9c759",
            revisionId: "a56a5e2d-493e-41e5-a972-12d359953bed",
            kind: "scene",
            name: "\u7F8A\u6BDB\u5730\u6BEF V2",
            savedAt: 1791645047871,
            values: {
              show_room: true,
              show_floor: true,
              show_legs: true,
              show_panels: true,
              show_rails: true,
              show_cloth: true,
              show_leather: true,
              show_net: true,
              show_rings: true,
              show_slides: true,
              show_cue: true,
              show_balls: true,
              show_other: true,
              isolate: "all",
              roomEnvironment: "crucible",
              background: "#07100e",
              floorMaterial: "woolV2",
              carpetCustom: true,
              carpetColor: "#b23d44",
              floorRepeat: 1,
              railWoodStyle: "redBrown",
              allTextures: true,
              colorMaps: true,
              normalMaps: true,
              roughnessMaps: true,
              mode: "original",
              wireframe: false
            }
          }
        },
        sceneSource: {
          source: "apps/three-game/config/test-field-presets.json",
          revisionId: "05224845-6490-4dcf-a6f9-1d100843c782",
          copiedAt: "2026-09-14T15:05:35.596Z"
        },
        aimSource: {
          source: "apps/three-game/config/test-field-presets.json",
          revisionId: "74c62ba8-d592-45d7-b998-105381558e58",
          copiedAt: "2026-09-30T16:14:26.828Z"
        },
        physicsSource: {
          path: "assets/three-table-preview/project-presets.json",
          name: "V1",
          revisionId: "d82ee80c-c3e9-4b43-8574-dd5d15ddd9dc",
          copiedAt: "2026-09-21T08:21:54.248844+00:00"
        },
        peekSource: {
          path: "apps/three-game/config/test-field-presets.json",
          name: "3D-v2",
          revisionId: "0c6759e6-0604-4edc-82d7-93e43bbc7832",
          copiedAt: "2026-10-20T14:24:10.849Z"
        },
        wirelessSource: {
          source: "apps/three-game/config/test-field-presets.json",
          revisionId: "ac087459-02f2-4979-9d7a-7392c31c8998",
          copiedAt: "2026-10-20T13:46:24.398Z"
        },
        cushionSpeedCorrectionSource: {
          parameter: "cushionSpeedCorrectionStrength",
          value: 1,
          copiedAt: "2026-10-20T19:37:58.170076+00:00"
        }
      };
    }
  });

  // apps/three-game/trial/tuning.cjs
  var require_tuning = __commonJS({
    "apps/three-game/trial/tuning.cjs"(exports, module) {
      var devicePreferences = require_device_preferences();
      var snapshot = require_tuning_snapshot();
      var releasedSnapshot = () => typeof window !== "undefined" && window.SnookerProduct?.releasedTuningSnapshot || snapshot;
      var DIFFICULTY_KEY = "snooker.3d-trial.difficulty.v1";
      var ids = ["novice", "intermediate", "professional", "master", "no-lines"];
      function readDifficulty(storage) {
        try {
          const value = (storage || localStorage).getItem(DIFFICULTY_KEY);
          return ids.includes(value) ? value : "novice";
        } catch {
          return "novice";
        }
      }
      function rememberDifficulty(id, storage) {
        if (!ids.includes(id)) return false;
        try {
          (storage || localStorage).setItem(DIFFICULTY_KEY, id);
        } catch {
        }
        return true;
      }
      function aimValues(id = readDifficulty()) {
        const saved = releasedSnapshot().presets.aim?.values || {};
        return { ...saved.difficultyProfiles?.[ids.includes(id) ? id : "novice"] || saved, peekFreeMaxZoom: devicePreferences.focusZoom() };
      }
      function createConfig(api, defaults) {
        return api.createGameClientConfig({
          ...defaults,
          aim: { ...defaults.aim, values: { ...defaults.aim.values, ...aimValues() } },
          physics: { ...defaults.physics, overrides: { ...defaults.physics.overrides, ...releasedSnapshot().presets.physics?.values } }
        });
      }
      module.exports = { get snapshot() {
        return releasedSnapshot();
      }, createConfig, readDifficulty, rememberDifficulty, aimValues, DIFFICULTY_KEY };
    }
  });

  // apps/three-game/trial/power-geometry.cjs
  var require_power_geometry = __commonJS({
    "apps/three-game/trial/power-geometry.cjs"(exports, module) {
      function powerGeometry(power, mobile) {
        const containerWidth = 58 * Math.max(1, power.height - 15) / 341;
        const width = 2 * containerWidth;
        const visualScale = power.visualScale || 1;
        return {
          containerWidth: containerWidth * visualScale,
          rect: { ...power, x: power.x, y: power.y - 42 * visualScale, width: Math.max(width, power.minimumCanvasWidth || 0), height: (power.height + 42) * visualScale }
        };
      }
      function alignPowerToFullscreen(power, fullscreen, { scale, offsetX = 0 }) {
        if (!power || !fullscreen?.width || !(scale > 0)) return power;
        const base = powerGeometry({ ...power, visualScale: 1 }, true).containerWidth;
        const visualScale = fullscreen.width / scale / (base + 0.5);
        const centerY = power.y + (power.height - 5) * (power.visualScale || 1) / 2;
        return {
          ...power,
          x: (fullscreen.left - offsetX) / scale,
          y: centerY - (power.height - 5) * visualScale / 2,
          visualScale,
          minimumCanvasWidth: fullscreen.width / scale
        };
      }
      module.exports = { powerGeometry, alignPowerToFullscreen };
    }
  });

  // apps/three-game/src/input/powerController.js
  var require_powerController = __commonJS({
    "apps/three-game/src/input/powerController.js"(exports, module) {
      (function installPowerController(root, factory) {
        const api = factory();
        if (typeof module === "object" && module.exports) {
          module.exports = api;
        }
        if (root) {
          root.SnookerPowerController = api;
          root.TestFieldPowerController = api;
        }
      })(typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : exports, function createPowerController() {
        const POWER_SEGMENT_COUNT = 4;
        const GUARD_SEGMENT_RATIO = 0.25;
        const TOTAL_UNITS = POWER_SEGMENT_COUNT + GUARD_SEGMENT_RATIO * 2;
        const DEFAULT_INNER_SLOT = {
          x: 89 / 339,
          y: 87 / 1983,
          width: 159 / 339,
          height: 1817 / 1983
        };
        const DEFAULT_BASE_ASPECT = 339 / 1983;
        function clamp(value, min, max) {
          const number = Number(value);
          if (!Number.isFinite(number)) return min;
          return Math.max(min, Math.min(max, number));
        }
        function resolvedPower(value) {
          return clamp(Number(value) || 0, 0, 100);
        }
        function rectFromDomRect(rect) {
          return {
            x: Number(rect?.x ?? rect?.left) || 0,
            y: Number(rect?.y ?? rect?.top) || 0,
            width: Math.max(1, Number(rect?.width) || 1),
            height: Math.max(1, Number(rect?.height) || 1)
          };
        }
        function createVisualBounds(rect, options = {}) {
          const bounds = rectFromDomRect(rect);
          const aspect = Number.isFinite(Number(options.baseAspect)) && Number(options.baseAspect) > 0 ? Number(options.baseAspect) : DEFAULT_BASE_ASPECT;
          const heightLimitedWidth = bounds.height * aspect;
          const widthLimitedHeight = bounds.width / aspect;
          let width = bounds.width;
          let height = bounds.height;
          if (heightLimitedWidth <= bounds.width) {
            width = heightLimitedWidth;
          } else {
            height = widthLimitedHeight;
          }
          return {
            x: bounds.x + (bounds.width - width) * 0.5,
            y: bounds.y + (bounds.height - height) * 0.5,
            width,
            height
          };
        }
        function createGeometry(rect, options = {}) {
          const hitBounds = rectFromDomRect(rect);
          const bounds = createVisualBounds(hitBounds, options);
          const slotRatio = options.innerSlot || DEFAULT_INNER_SLOT;
          const slot = {
            x: bounds.x + bounds.width * slotRatio.x,
            y: bounds.y + bounds.height * slotRatio.y,
            width: bounds.width * slotRatio.width,
            height: bounds.height * slotRatio.height
          };
          const unit = slot.height / TOTAL_UNITS;
          const startGuardHeight = unit * GUARD_SEGMENT_RATIO;
          const endGuardHeight = unit * GUARD_SEGMENT_RATIO;
          const powerTop = slot.y + startGuardHeight;
          const powerBottom = slot.y + slot.height - endGuardHeight;
          const dividerYs = [];
          for (let index = 0; index <= POWER_SEGMENT_COUNT; index += 1) {
            dividerYs.push(powerTop + (powerBottom - powerTop) * index / POWER_SEGMENT_COUNT);
          }
          return {
            bounds,
            hitBounds,
            slot,
            unit,
            startGuardHeight,
            endGuardHeight,
            powerTop,
            powerBottom,
            powerRange: Math.max(1, powerBottom - powerTop),
            dividerYs
          };
        }
        function clientPointY(input) {
          return Number(input?.clientY ?? input?.y ?? input) || 0;
        }
        function powerFromPoint(input, rect, options = {}) {
          const geometry = createGeometry(rect, options);
          const y = clamp(clientPointY(input), geometry.slot.y, geometry.powerBottom);
          if (y <= geometry.powerTop) return 0;
          return resolvedPower((y - geometry.powerTop) / geometry.powerRange * 100);
        }
        function powerFromPullDistance(distance, rect, options = {}) {
          const geometry = createGeometry(rect, options);
          const pullDistance = Math.max(0, Number(distance) || 0);
          const effectiveDistance = Math.max(0, pullDistance - geometry.startGuardHeight);
          return resolvedPower(effectiveDistance / geometry.powerRange * 100);
        }
        function cueTipYForPower(power, rect, options = {}) {
          const geometry = createGeometry(rect, options);
          const value = resolvedPower(power);
          if (value <= 0) return geometry.slot.y;
          return geometry.powerTop + geometry.powerRange * (value / 100);
        }
        function cueTipYForPullDistance(distance, rect, options = {}) {
          const geometry = createGeometry(rect, options);
          const maxDistance = geometry.powerBottom - geometry.slot.y;
          return geometry.slot.y + clamp(Number(distance) || 0, 0, maxDistance);
        }
        function maskOpacityForPower(power) {
          return 0.5 * (1 - resolvedPower(power) / 100);
        }
        function isDrawableImageAsset(image) {
          if (!image) return false;
          const width = Number(image.naturalWidth || image.width) || 0;
          const height = Number(image.naturalHeight || image.height) || 0;
          return Boolean((image.complete || image.assetState?.status === "loaded") && width > 0 && height > 0);
        }
        function arePowerControllerImageAssetsReady(assets = {}) {
          return isDrawableImageAsset(assets.base) && isDrawableImageAsset(assets.cue);
        }
        function drawRoundedRect(ctx, rect, radius) {
          const r = Math.max(0, Math.min(radius, rect.width * 0.5, rect.height * 0.5));
          ctx.beginPath();
          ctx.moveTo(rect.x + r, rect.y);
          ctx.lineTo(rect.x + rect.width - r, rect.y);
          ctx.quadraticCurveTo(rect.x + rect.width, rect.y, rect.x + rect.width, rect.y + r);
          ctx.lineTo(rect.x + rect.width, rect.y + rect.height - r);
          ctx.quadraticCurveTo(rect.x + rect.width, rect.y + rect.height, rect.x + rect.width - r, rect.y + rect.height);
          ctx.lineTo(rect.x + r, rect.y + rect.height);
          ctx.quadraticCurveTo(rect.x, rect.y + rect.height, rect.x, rect.y + rect.height - r);
          ctx.lineTo(rect.x, rect.y + r);
          ctx.quadraticCurveTo(rect.x, rect.y, rect.x + r, rect.y);
          ctx.closePath();
        }
        function drawFallbackBase(ctx, bounds, geometry) {
          const frameGradient = ctx.createLinearGradient(bounds.x, bounds.y, bounds.x + bounds.width, bounds.y);
          frameGradient.addColorStop(0, "#212733");
          frameGradient.addColorStop(0.18, "#8b8f98");
          frameGradient.addColorStop(0.5, "#363a43");
          frameGradient.addColorStop(0.82, "#9ca0aa");
          frameGradient.addColorStop(1, "#1b2029");
          ctx.fillStyle = frameGradient;
          drawRoundedRect(ctx, bounds, bounds.width * 0.22);
          ctx.fill();
          ctx.strokeStyle = "rgba(255, 255, 255, 0.72)";
          ctx.lineWidth = Math.max(1, bounds.width * 0.025);
          ctx.stroke();
          const bar = ctx.createLinearGradient(geometry.slot.x, geometry.slot.y, geometry.slot.x, geometry.slot.y + geometry.slot.height);
          bar.addColorStop(0, "#fff200");
          bar.addColorStop(0.36, "#f7b400");
          bar.addColorStop(0.68, "#ff5a00");
          bar.addColorStop(1, "#ee0000");
          ctx.fillStyle = bar;
          drawRoundedRect(ctx, geometry.slot, geometry.slot.width * 0.38);
          ctx.fill();
        }
        function drawFallbackCue(ctx, cueRect) {
          const centerX = cueRect.x + cueRect.width * 0.5;
          const tipHeight = cueRect.height * 0.01;
          const ferruleHeight = cueRect.height * 0.024;
          const ferruleWidth = cueRect.width * 0.38;
          const tipWidth = ferruleWidth * 0.96;
          const topY = cueRect.y + tipHeight + ferruleHeight;
          const bottomY = cueRect.y + cueRect.height;
          const topWidth = ferruleWidth * 0.92;
          const midWidth = cueRect.width * 0.55;
          const tailWidth = cueRect.width * 0.82;
          const drawShaftPath = () => {
            ctx.beginPath();
            ctx.moveTo(centerX - topWidth * 0.5, topY);
            ctx.bezierCurveTo(
              centerX - midWidth * 0.5,
              cueRect.y + cueRect.height * 0.34,
              centerX - tailWidth * 0.5,
              cueRect.y + cueRect.height * 0.82,
              centerX - tailWidth * 0.5,
              bottomY
            );
            ctx.quadraticCurveTo(
              centerX,
              bottomY + cueRect.width * 0.11,
              centerX + tailWidth * 0.5,
              bottomY
            );
            ctx.bezierCurveTo(
              centerX + tailWidth * 0.5,
              cueRect.y + cueRect.height * 0.82,
              centerX + midWidth * 0.5,
              cueRect.y + cueRect.height * 0.34,
              centerX + topWidth * 0.5,
              topY
            );
            ctx.closePath();
          };
          const shaft = ctx.createLinearGradient(cueRect.x, cueRect.y, cueRect.x + cueRect.width, cueRect.y);
          shaft.addColorStop(0, "#7a3f1d");
          shaft.addColorStop(0.16, "#c37a34");
          shaft.addColorStop(0.42, "#ffd58b");
          shaft.addColorStop(0.54, "#fff0b9");
          shaft.addColorStop(0.66, "#e59d4f");
          shaft.addColorStop(1, "#6e3318");
          drawShaftPath();
          ctx.fillStyle = shaft;
          ctx.fill();
          ctx.save();
          drawShaftPath();
          ctx.clip();
          ctx.globalAlpha = 0.28;
          ctx.strokeStyle = "#7d3f1a";
          ctx.lineWidth = Math.max(0.7, cueRect.width * 0.035);
          [0.34, 0.47, 0.61].forEach((ratio, index) => {
            const offset = (ratio - 0.5) * cueRect.width * 0.34;
            ctx.beginPath();
            ctx.moveTo(centerX + offset * 0.45, topY + cueRect.height * 0.04);
            ctx.bezierCurveTo(
              centerX + offset * 0.8,
              cueRect.y + cueRect.height * (0.28 + index * 0.03),
              centerX + offset * 1.08,
              cueRect.y + cueRect.height * 0.66,
              centerX + offset * 1.24,
              bottomY - cueRect.height * 0.05
            );
            ctx.stroke();
          });
          const highlight = ctx.createLinearGradient(centerX, topY, centerX, bottomY);
          highlight.addColorStop(0, "rgba(255, 255, 255, 0.42)");
          highlight.addColorStop(0.22, "rgba(255, 255, 255, 0.18)");
          highlight.addColorStop(0.72, "rgba(255, 255, 255, 0.28)");
          highlight.addColorStop(1, "rgba(255, 255, 255, 0.08)");
          ctx.strokeStyle = highlight;
          ctx.lineWidth = Math.max(1, cueRect.width * 0.11);
          ctx.beginPath();
          ctx.moveTo(centerX - cueRect.width * 0.05, topY + cueRect.height * 0.02);
          ctx.bezierCurveTo(
            centerX - cueRect.width * 0.03,
            cueRect.y + cueRect.height * 0.35,
            centerX + cueRect.width * 0.01,
            cueRect.y + cueRect.height * 0.72,
            centerX + cueRect.width * 0.05,
            bottomY - cueRect.height * 0.04
          );
          ctx.stroke();
          ctx.restore();
          drawShaftPath();
          ctx.strokeStyle = "rgba(60, 28, 13, 0.54)";
          ctx.lineWidth = Math.max(0.7, cueRect.width * 0.035);
          ctx.stroke();
          const ferruleRect = {
            x: centerX - ferruleWidth * 0.5,
            y: cueRect.y + tipHeight,
            width: ferruleWidth,
            height: ferruleHeight
          };
          drawRoundedRect(ctx, ferruleRect, Math.max(0.6, cueRect.width * 0.025));
          const ferrule = ctx.createLinearGradient(centerX - ferruleWidth * 0.5, 0, centerX + ferruleWidth * 0.5, 0);
          ferrule.addColorStop(0, "#7a5617");
          ferrule.addColorStop(0.18, "#d8a93f");
          ferrule.addColorStop(0.5, "#fff0a8");
          ferrule.addColorStop(0.78, "#b47a1f");
          ferrule.addColorStop(1, "#5c3b12");
          ctx.fillStyle = ferrule;
          ctx.fill();
          ctx.strokeStyle = "rgba(255, 244, 170, 0.44)";
          ctx.lineWidth = Math.max(0.5, cueRect.width * 0.018);
          ctx.beginPath();
          ctx.moveTo(ferruleRect.x + ferruleRect.width * 0.18, ferruleRect.y + ferruleRect.height * 0.18);
          ctx.lineTo(ferruleRect.x + ferruleRect.width * 0.82, ferruleRect.y + ferruleRect.height * 0.18);
          ctx.stroke();
          const tipTopY = cueRect.y + tipHeight * 0.36;
          const tipBaseY = cueRect.y + tipHeight;
          const tipLeft = centerX - tipWidth * 0.5;
          const tipRight = centerX + tipWidth * 0.5;
          const tip = ctx.createLinearGradient(tipLeft, cueRect.y, tipRight, cueRect.y);
          tip.addColorStop(0, "#152f28");
          tip.addColorStop(0.48, "#256d53");
          tip.addColorStop(1, "#10261f");
          ctx.beginPath();
          ctx.moveTo(tipLeft, tipBaseY);
          ctx.bezierCurveTo(
            tipLeft + tipWidth * 0.22,
            tipTopY,
            tipRight - tipWidth * 0.22,
            tipTopY,
            tipRight,
            tipBaseY
          );
          ctx.lineTo(tipRight, tipBaseY + tipHeight * 0.16);
          ctx.quadraticCurveTo(centerX, tipBaseY + tipHeight * 0.28, tipLeft, tipBaseY + tipHeight * 0.16);
          ctx.closePath();
          ctx.fillStyle = tip;
          ctx.fill();
          ctx.strokeStyle = "rgba(4, 16, 12, 0.42)";
          ctx.lineWidth = Math.max(0.4, cueRect.width * 0.014);
          ctx.stroke();
        }
        function drawPowerController(ctx, rect, state = {}, assets = {}) {
          const geometry = createGeometry(rect, state);
          const bounds = geometry.bounds;
          const power = resolvedPower(state.power);
          const enabled = state.enabled !== false;
          const alpha = enabled ? 1 : 0.5;
          const useImageAssets = arePowerControllerImageAssetsReady(assets);
          ctx.save();
          ctx.globalAlpha *= alpha;
          if (useImageAssets) {
            ctx.drawImage(assets.base, bounds.x, bounds.y, bounds.width, bounds.height);
          } else {
            drawFallbackBase(ctx, bounds, geometry);
          }
          ctx.save();
          drawRoundedRect(ctx, geometry.slot, geometry.slot.width * 0.36);
          ctx.clip();
          ctx.fillStyle = `rgba(0, 0, 0, ${maskOpacityForPower(power).toFixed(3)})`;
          ctx.fillRect(geometry.slot.x, geometry.slot.y, geometry.slot.width, geometry.slot.height);
          ctx.strokeStyle = "rgba(18, 20, 24, 0.42)";
          ctx.lineWidth = Math.max(1, bounds.width * 0.018);
          geometry.dividerYs.forEach((y) => {
            ctx.beginPath();
            ctx.moveTo(geometry.slot.x, y);
            ctx.lineTo(geometry.slot.x + geometry.slot.width, y);
            ctx.stroke();
          });
          ctx.restore();
          const cueTipY = Number.isFinite(Number(state.pullDistancePx)) ? cueTipYForPullDistance(state.pullDistancePx, bounds, state) : cueTipYForPower(power, bounds, state);
          const cueHeight = geometry.slot.height;
          const cueNaturalWidth = assets.cue?.naturalWidth || assets.cue?.width || 0;
          const cueNaturalHeight = assets.cue?.naturalHeight || assets.cue?.height || 0;
          const cueAspect = cueNaturalWidth > 0 && cueNaturalHeight > 0 ? cueNaturalWidth / cueNaturalHeight : 0.05;
          const cueWidth = cueHeight * cueAspect;
          const cueRect = {
            x: bounds.x + bounds.width * 0.5 - cueWidth * 0.5,
            y: cueTipY,
            width: cueWidth,
            height: cueHeight
          };
          ctx.save();
          drawRoundedRect(ctx, geometry.slot, geometry.slot.width * 0.36);
          ctx.clip();
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";
          ctx.shadowColor = "rgba(0, 0, 0, 0.45)";
          ctx.shadowBlur = Math.max(2, bounds.width * 0.08);
          ctx.shadowOffsetY = Math.max(1, bounds.height * 0.01);
          if (useImageAssets) {
            ctx.drawImage(assets.cue, cueRect.x, cueRect.y, cueRect.width, cueRect.height);
          } else {
            drawFallbackCue(ctx, cueRect);
          }
          ctx.restore();
          ctx.restore();
        }
        return {
          constants: {
            POWER_SEGMENT_COUNT,
            GUARD_SEGMENT_RATIO,
            TOTAL_UNITS,
            DEFAULT_INNER_SLOT,
            DEFAULT_BASE_ASPECT
          },
          createVisualBounds,
          createGeometry,
          arePowerControllerImageAssetsReady,
          cueTipYForPower,
          cueTipYForPullDistance,
          drawPowerController,
          isDrawableImageAsset,
          maskOpacityForPower,
          powerFromPoint,
          powerFromPullDistance,
          resolvedPower
        };
      });
    }
  });

  // apps/three-game/src/input/shotControl.js
  var require_shotControl = __commonJS({
    "apps/three-game/src/input/shotControl.js"(exports, module) {
      (function installShotControl(root, factory) {
        const api = factory(root || {});
        if (typeof module === "object" && module.exports) {
          module.exports = api;
        }
        if (root) {
          root.SnookerShotControl = api;
          root.TestFieldShotControl = api;
        }
      })(typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : exports, function createShotControl() {
        let PowerController = typeof globalThis !== "undefined" && globalThis.SnookerPowerController || null;
        if (!PowerController && typeof __require === "function") {
          try {
            PowerController = require_powerController();
          } catch (error) {
            PowerController = null;
          }
        }
        const TIP_PAD_MAX_OFFSET = 0.5;
        const TIP_PAD_SCREEN_RADIUS_RATIO = 0.4;
        const POWER_PULL_TOP_PX = 10;
        const POWER_PULL_BOTTOM_PX = 168;
        const MAX_CUE_PULL_OFFSET_MM = 250;
        const CUE_ADDRESS_GAP_MM = 0;
        const CUE_FOLLOW_THROUGH_RATIO = 0.5;
        const MAX_CUE_FOLLOW_THROUGH_MM = MAX_CUE_PULL_OFFSET_MM * CUE_FOLLOW_THROUGH_RATIO;
        const CUE_SPEED_BALL_RATIO = 0.75;
        const CUE_IMPACT_RETENTION = 0.6;
        const CUE_BACK_PAUSE_MS = 300;
        const CUE_STRIKE_HOLD_MS = 350;
        const CUE_FADE_MS = 550;
        const CUE_STROKE_MODEL = "uniform-75-60-250-50-v1";
        const TIP_DRAG_FULL_DISTANCE_PX = 170;
        const SHOT_INTERACTION_MODE = {
          TOUCH_PULL: "touch-pull"
        };
        function clamp(value, min, max) {
          const number = Number(value);
          if (!Number.isFinite(number)) return min;
          return Math.max(min, Math.min(max, number));
        }
        function normalize(vector) {
          const length = Math.hypot(vector?.x || 0, vector?.y || 0);
          if (length <= 1e-6) return { x: 1, y: 0 };
          return { x: vector.x / length, y: vector.y / length };
        }
        function normalizeAngleDeg(degrees) {
          let value = Number(degrees) || 0;
          while (value > 180) value -= 360;
          while (value <= -180) value += 360;
          return value;
        }
        function directionToAngleDeg(direction) {
          const value = normalize(direction);
          return normalizeAngleDeg(Math.atan2(value.y, value.x) * 180 / Math.PI);
        }
        function angleDegToDirection(degrees) {
          const radians = normalizeAngleDeg(degrees) * Math.PI / 180;
          return { x: Math.cos(radians), y: Math.sin(radians) };
        }
        function powerFromPull(startClientY, currentClientY, options = {}) {
          if (PowerController && options.controllerRect) {
            return PowerController.powerFromPullDistance(
              (Number(currentClientY) || 0) - (Number(startClientY) || 0),
              options.controllerRect,
              options
            );
          }
          const top = Number.isFinite(Number(options.topPx)) ? Number(options.topPx) : POWER_PULL_TOP_PX;
          const bottom = Number.isFinite(Number(options.bottomPx)) ? Number(options.bottomPx) : POWER_PULL_BOTTOM_PX;
          const travel = Math.max(1, bottom - top);
          const pullDistance = clamp((Number(currentClientY) || 0) - (Number(startClientY) || 0), 0, travel);
          return resolvedShotPower(pullDistance / travel * 100);
        }
        function powerPullVisualOffsetPx(power) {
          if (PowerController && this?.controllerRect) {
            return PowerController.cueTipYForPower(power, this.controllerRect, this);
          }
          const ratio = clamp((Number(power) || 0) / 100, 0, 1);
          return 4 + ratio * 34;
        }
        function clampTipOffsetCircle(offset, maxOffset = TIP_PAD_MAX_OFFSET) {
          let x = clamp(offset?.x || 0, -maxOffset, maxOffset);
          let y = clamp(offset?.y || 0, -maxOffset, maxOffset);
          const offsetLength = Math.hypot(x, y);
          if (offsetLength > maxOffset) {
            x = x / offsetLength * maxOffset;
            y = y / offsetLength * maxOffset;
          }
          return { x, y };
        }
        function rectOrigin(rect) {
          return {
            x: Number.isFinite(Number(rect?.left)) ? Number(rect.left) : Number(rect?.x) || 0,
            y: Number.isFinite(Number(rect?.top)) ? Number(rect.top) : Number(rect?.y) || 0
          };
        }
        function tipPadOffsetScale(rect, options = {}) {
          const maxOffset = Number.isFinite(Number(options.maxOffset)) ? Number(options.maxOffset) : TIP_PAD_MAX_OFFSET;
          const screenRadiusRatio = Number.isFinite(Number(options.screenRadiusRatio)) ? Number(options.screenRadiusRatio) : TIP_PAD_SCREEN_RADIUS_RATIO;
          if (Number.isFinite(Number(options.offsetScalePx))) {
            return Math.max(1, Number(options.offsetScalePx));
          }
          return Math.max(1, Math.min(Number(rect?.width) || 1, Number(rect?.height) || 1) * screenRadiusRatio / maxOffset);
        }
        function tipPadPointFromOffset(offset, rect, options = {}) {
          const origin = rectOrigin(rect);
          const scale = tipPadOffsetScale(rect, options);
          const maxOffset = Number.isFinite(Number(options.maxOffset)) ? Number(options.maxOffset) : TIP_PAD_MAX_OFFSET;
          const clamped = clampTipOffsetCircle(offset, maxOffset);
          return {
            x: origin.x + (Number(rect?.width) || 0) * 0.5 + clamped.x * scale,
            y: origin.y + (Number(rect?.height) || 0) * 0.5 - clamped.y * scale
          };
        }
        function tipOffsetFromPoint(point, rect, options = {}) {
          const origin = rectOrigin(rect);
          const scale = tipPadOffsetScale(rect, options);
          const maxOffset = Number.isFinite(Number(options.maxOffset)) ? Number(options.maxOffset) : TIP_PAD_MAX_OFFSET;
          return clampTipOffsetCircle({
            x: ((Number(point?.x) || 0) - (origin.x + (Number(rect?.width) || 0) * 0.5)) / scale,
            y: (origin.y + (Number(rect?.height) || 0) * 0.5 - (Number(point?.y) || 0)) / scale
          }, maxOffset);
        }
        function tipOffsetFromClientPoint(clientX, clientY, rect, options = {}) {
          return tipOffsetFromPoint({ x: clientX, y: clientY }, rect, options);
        }
        function tipOffsetFromPointerDelta(baseOffset, delta, options = {}) {
          const maxOffset = Number.isFinite(Number(options.maxOffset)) ? Number(options.maxOffset) : TIP_PAD_MAX_OFFSET;
          const fullDistancePx = Math.max(
            1,
            Number.isFinite(Number(options.fullDistancePx)) ? Number(options.fullDistancePx) : TIP_DRAG_FULL_DISTANCE_PX
          );
          return clampTipOffsetCircle({
            x: (baseOffset?.x || 0) + (delta?.x || 0) / fullDistancePx * maxOffset,
            y: (baseOffset?.y || 0) - (delta?.y || 0) / fullDistancePx * maxOffset
          }, maxOffset);
        }
        function resolvedShotPower(power) {
          return clamp(Number(power) || 0, 0, 100);
        }
        function powerToPullOffsetMm(power, options = {}) {
          const maxPullOffsetMm = Math.max(
            0,
            Number.isFinite(Number(options.maxPullOffsetMm)) ? Number(options.maxPullOffsetMm) : MAX_CUE_PULL_OFFSET_MM
          );
          return resolvedShotPower(power) / 100 * maxPullOffsetMm;
        }
        function powerToAddressOffsetMm(power, options = {}) {
          return CUE_ADDRESS_GAP_MM + powerToPullOffsetMm(power, options);
        }
        function cuePullDurationMs(power) {
          return 200 + 800 * resolvedShotPower(power) / 100;
        }
        function cuePullProgress(progress) {
          const u = clamp(progress, 0, 1);
          return u < 0.5 ? 2 * u * u : 1 - 2 * (1 - u) * (1 - u);
        }
        function createCueStrokeProfile(power, ballSpeedMmS, options = {}) {
          const strength = resolvedShotPower(power);
          const pullOffset = powerToAddressOffsetMm(strength, options);
          const ballSpeed = Number(ballSpeedMmS) > 0 ? Number(ballSpeedMmS) : 7e3 * strength / 100;
          const cueSpeedMmS = ballSpeed * CUE_SPEED_BALL_RATIO;
          const postImpactCueSpeedMmS = cueSpeedMmS * CUE_IMPACT_RETENTION;
          const followDistance = pullOffset * CUE_FOLLOW_THROUGH_RATIO;
          const duration = cueSpeedMmS > 0 ? 2e3 * pullOffset / cueSpeedMmS : 0;
          const followThroughDuration = postImpactCueSpeedMmS > 0 ? 2e3 * followDistance / postImpactCueSpeedMmS : 0;
          const backPauseDuration = options.replay === true ? CUE_BACK_PAUSE_MS : 0;
          return {
            strokeModel: CUE_STROKE_MODEL,
            ballSpeedMmS: ballSpeed,
            cueSpeedMmS,
            postImpactCueSpeedMmS,
            duration,
            backPauseDuration,
            impactDelay: backPauseDuration + duration,
            pullOffset,
            followThroughOffset: -followDistance,
            followThroughDuration,
            accelerationMmS2: pullOffset > 0 ? cueSpeedMmS * cueSpeedMmS / (2 * pullOffset) : 0,
            decelerationMmS2: followDistance > 0 ? postImpactCueSpeedMmS * postImpactCueSpeedMmS / (2 * followDistance) : 0
          };
        }
        function resolveClientY(input) {
          if (typeof input === "number") return Number(input) || 0;
          return Number(input?.clientY ?? input?.y) || 0;
        }
        function createTouchPullShotInteraction(options = {}) {
          const topPx = Number.isFinite(Number(options.topPx)) ? Number(options.topPx) : POWER_PULL_TOP_PX;
          const bottomPx = Number.isFinite(Number(options.bottomPx)) ? Number(options.bottomPx) : POWER_PULL_BOTTOM_PX;
          const controllerRect = options.controllerRect || null;
          const controllerGeometry = controllerRect && PowerController ? PowerController.createGeometry(controllerRect, options) : null;
          const maxControllerDistance = controllerGeometry ? Math.max(1, controllerGeometry.powerBottom - controllerGeometry.slot.y) : Math.max(1, bottomPx - topPx);
          const deadZonePx = maxControllerDistance * Math.max(0, Number(options.deadZonePower) || 0) / 100;
          let pull = null;
          function snapshot(extra = {}) {
            return {
              mode: SHOT_INTERACTION_MODE.TOUCH_PULL,
              active: Boolean(pull),
              power: pull?.power || 0,
              pullDistancePx: pull?.pullDistancePx || 0,
              ...extra
            };
          }
          function begin(input) {
            pull = {
              startClientY: resolveClientY(input),
              normalizeStart: Boolean(options.normalizeTouchStart && input?.pointerType === "touch"),
              power: 0,
              pullDistancePx: 0
            };
            return snapshot();
          }
          function move(input) {
            if (!pull) return snapshot({ active: false });
            const y = resolveClientY(input);
            if (pull.normalizeStart && y - pull.startClientY >= deadZonePx) {
              pull.startClientY = y - deadZonePx;
              pull.normalizeStart = false;
            }
            pull.pullDistancePx = clamp(y - pull.startClientY, 0, maxControllerDistance + deadZonePx);
            pull.power = y - pull.startClientY <= deadZonePx + 1e-9 ? 0 : powerFromPull(pull.startClientY + deadZonePx, y, {
              ...options,
              controllerRect,
              topPx,
              bottomPx
            });
            return snapshot();
          }
          function end(input) {
            if (pull && input && !options.ignoreReleaseMotion) move(input);
            const result = snapshot({
              shouldShoot: Boolean(pull && pull.power > 0)
            });
            pull = null;
            return { ...result, active: false };
          }
          function cancel() {
            pull = null;
            return snapshot({ active: false, power: 0, shouldShoot: false });
          }
          return {
            mode: SHOT_INTERACTION_MODE.TOUCH_PULL,
            begin,
            move,
            end,
            cancel,
            getState: snapshot
          };
        }
        function createShotInteraction(mode, options = {}) {
          return createTouchPullShotInteraction(options);
        }
        function createFrameRenderScheduler(options = {}) {
          const scheduleFrame = options.scheduleFrame || ((callback) => typeof requestAnimationFrame === "function" ? requestAnimationFrame(callback) : setTimeout(callback, 0));
          const render = typeof options.render === "function" ? options.render : () => {
          };
          let pending = false;
          function request() {
            if (pending) return false;
            pending = true;
            scheduleFrame(() => {
              pending = false;
              render();
            });
            return true;
          }
          function flush() {
            if (!pending) return false;
            pending = false;
            render();
            return true;
          }
          return {
            flush,
            isPending: () => pending,
            request
          };
        }
        function createCueStrikeAnimation(options = {}) {
          const power = resolvedShotPower(options.power);
          if (power <= 0 || !options.cuePos || !options.direction) return null;
          const direction = normalize(options.direction);
          const tipOffset = clampTipOffsetCircle(options.tipOffset || { x: 0, y: 0 });
          const profile = createCueStrokeProfile(power, options.ballSpeedMmS, options);
          return {
            ...profile,
            phase: "strike",
            power,
            startTime: Number.isFinite(Number(options.now)) ? Number(options.now) : Date.now(),
            holdDuration: Number.isFinite(Number(options.holdDuration)) ? Math.max(0, Number(options.holdDuration)) : CUE_STRIKE_HOLD_MS,
            fadeDuration: Number.isFinite(Number(options.fadeDuration)) ? Number(options.fadeDuration) : CUE_FADE_MS,
            currentOffset: profile.pullOffset,
            opacity: 1,
            fired: false,
            cuePos: { x: Number(options.cuePos.x) || 0, y: Number(options.cuePos.y) || 0 },
            direction,
            radius: Number(options.radius) || 26.25,
            sideOffsetRatio: tipOffset.x || 0,
            shotPayload: options.shotPayload || null,
            replayArmed: false
          };
        }
        function updateCueStrikeAnimation(animation, timestamp) {
          if (!animation) return { animation: null, fired: false, shotPayload: null, active: false };
          const now = Number.isFinite(Number(timestamp)) ? Number(timestamp) : Date.now();
          if (animation.phase === "strike") {
            const impactTime = animation.startTime + (animation.impactDelay ?? (animation.backPauseDuration || 0) + animation.duration);
            const progress = now >= impactTime ? 1 : clamp((now - animation.startTime - (animation.backPauseDuration || 0)) / Math.max(1e-6, animation.duration), 0, 1);
            const next = {
              ...animation,
              currentOffset: animation.pullOffset * (1 - progress * progress)
            };
            if (progress >= 1 && !next.fired) {
              next.fired = true;
              next.phase = "follow-through";
              next.startTime = now;
              next.currentOffset = 0;
              next.opacity = 1;
              return { animation: next, fired: true, shotPayload: next.shotPayload, active: true };
            }
            return { animation: next, fired: false, shotPayload: null, active: true };
          }
          if (animation.phase === "follow-through") {
            const duration = Math.max(1, animation.followThroughDuration ?? animation.duration * Math.abs(animation.followThroughOffset) / animation.pullOffset);
            const progress = now >= animation.startTime + duration ? 1 : clamp((now - animation.startTime) / duration, 0, 1);
            const eased = 1 - (1 - progress) * (1 - progress);
            const next = {
              ...animation,
              currentOffset: animation.followThroughOffset * eased,
              opacity: 1
            };
            if (progress >= 1) {
              next.phase = "hold";
              next.startTime = animation.startTime + duration;
              next.currentOffset = animation.followThroughOffset;
              return updateCueStrikeAnimation(next, now);
            }
            return { animation: next, fired: false, shotPayload: null, active: true };
          }
          if (animation.phase === "hold") {
            const duration = Math.max(0, animation.holdDuration ?? CUE_STRIKE_HOLD_MS);
            const next = {
              ...animation,
              currentOffset: animation.followThroughOffset,
              opacity: 1
            };
            if (now - animation.startTime >= duration) {
              next.phase = "fade";
              next.startTime = animation.startTime + duration;
              return updateCueStrikeAnimation(next, now);
            }
            return { animation: next, fired: false, shotPayload: null, active: true };
          }
          if (animation.phase === "fade") {
            const duration = Math.max(1, animation.fadeDuration || CUE_FADE_MS);
            const progress = Math.min(1, (now - animation.startTime) / duration);
            const next = {
              ...animation,
              currentOffset: animation.followThroughOffset,
              opacity: Math.max(0, 1 - progress)
            };
            if (progress >= 1) return { animation: null, fired: false, shotPayload: null, active: false };
            return { animation: next, fired: false, shotPayload: null, active: true };
          }
          return { animation: null, fired: false, shotPayload: null, active: false };
        }
        const api = {
          constants: {
            TIP_PAD_MAX_OFFSET,
            TIP_PAD_SCREEN_RADIUS_RATIO,
            POWER_PULL_TOP_PX,
            POWER_PULL_BOTTOM_PX,
            CUE_FOLLOW_THROUGH_RATIO,
            MAX_CUE_FOLLOW_THROUGH_MM,
            CUE_STRIKE_HOLD_MS,
            CUE_FADE_MS,
            MAX_CUE_PULL_OFFSET_MM,
            CUE_ADDRESS_GAP_MM,
            CUE_SPEED_BALL_RATIO,
            CUE_IMPACT_RETENTION,
            CUE_BACK_PAUSE_MS,
            CUE_STROKE_MODEL,
            TIP_DRAG_FULL_DISTANCE_PX,
            SHOT_INTERACTION_MODE
          },
          angleDegToDirection,
          clamp,
          clampTipOffsetCircle,
          createFrameRenderScheduler,
          createShotInteraction,
          createTouchPullShotInteraction,
          createCueStrikeAnimation,
          createCueStrokeProfile,
          cuePullDurationMs,
          cuePullProgress,
          directionToAngleDeg,
          normalize,
          normalizeAngleDeg,
          powerFromPull,
          powerPullVisualOffsetPx,
          powerToPullOffsetMm,
          powerToAddressOffsetMm,
          resolvedShotPower,
          tipOffsetFromPoint,
          tipOffsetFromClientPoint,
          tipOffsetFromPointerDelta,
          tipPadOffsetScale,
          tipPadPointFromOffset,
          updateCueStrikeAnimation
        };
        return api;
      });
    }
  });

  // apps/three-game/src/input/shotControlRenderer.js
  var require_shotControlRenderer = __commonJS({
    "apps/three-game/src/input/shotControlRenderer.js"(exports, module) {
      (function installShotControlRenderer(root, factory) {
        let PowerController = root?.SnookerPowerController || root?.TestFieldPowerController || null;
        let ShotControl = root?.SnookerShotControl || root?.TestFieldShotControl || null;
        if (typeof module === "object" && module.exports) {
          PowerController = PowerController || require_powerController();
          ShotControl = ShotControl || require_shotControl();
        }
        const api = factory(PowerController, ShotControl);
        if (typeof module === "object" && module.exports) {
          module.exports = api;
        }
        if (root) {
          root.SnookerShotControlRenderer = api;
          root.TestFieldShotControlRenderer = api;
        }
      })(typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : exports, function createShotControlRenderer(PowerController, ShotControl) {
        const DEFAULT_TIP_RADIUS_RATIO = 0.42;
        const DEFAULT_TIP_PAD_FILL_ALPHA = 0.18;
        function rectFrom(rect = {}) {
          return {
            x: Number(rect.x ?? rect.left) || 0,
            y: Number(rect.y ?? rect.top) || 0,
            width: Math.max(1, Number(rect.width) || 1),
            height: Math.max(1, Number(rect.height) || 1)
          };
        }
        function pointInRect(point, rect) {
          return Boolean(
            point && rect && point.x >= rect.x && point.x <= rect.x + rect.width && point.y >= rect.y && point.y <= rect.y + rect.height
          );
        }
        function tipPadOffsetScale(rect, options = {}) {
          const { radius, dotRadius } = tipPadMetrics(rect, options);
          const maxOffset = Number.isFinite(Number(options.maxOffset)) ? Number(options.maxOffset) : ShotControl.constants.TIP_PAD_MAX_OFFSET;
          return Math.max(1, (radius - dotRadius) / Math.max(1e-6, maxOffset));
        }
        function tipPadMetrics(rect, options = {}) {
          const pad = rectFrom(rect);
          const radius = Math.min(pad.width, pad.height) * (options.radiusRatio || DEFAULT_TIP_RADIUS_RATIO);
          return {
            dotRadius: options.dotRadius || Math.max(5, radius * 0.14),
            pad,
            radius
          };
        }
        function drawTipPad(ctx, rect, state = {}, options = {}) {
          const { pad, radius, dotRadius } = tipPadMetrics(rect, options);
          const center = {
            x: pad.x + pad.width * 0.5,
            y: pad.y + pad.height * 0.5
          };
          const tipOffset = state.tipOffset || { x: 0, y: 0 };
          const alpha = Number.isFinite(Number(options.alpha)) ? Number(options.alpha) : 0.72;
          ctx.save();
          ctx.globalAlpha = alpha;
          ctx.fillStyle = options.fillStyle || `rgba(245, 250, 246, ${DEFAULT_TIP_PAD_FILL_ALPHA})`;
          ctx.beginPath();
          ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = options.ringStyle || "rgba(245, 250, 246, 0.28)";
          ctx.lineWidth = options.ringWidth || Math.max(2, radius * 0.08);
          ctx.stroke();
          ctx.globalAlpha = alpha;
          ctx.strokeStyle = options.crossStyle || "rgba(245, 250, 246, 0.26)";
          ctx.lineWidth = options.crossWidth || Math.max(1, radius * 0.03);
          ctx.beginPath();
          ctx.moveTo(center.x - radius, center.y);
          ctx.lineTo(center.x + radius, center.y);
          ctx.moveTo(center.x, center.y - radius);
          ctx.lineTo(center.x, center.y + radius);
          ctx.stroke();
          const dot = ShotControl.tipPadPointFromOffset(tipOffset, pad, {
            maxOffset: ShotControl.constants.TIP_PAD_MAX_OFFSET,
            // Keep the full red dot inside the pad at the maximum allowed offset.
            offsetScalePx: tipPadOffsetScale(pad, { dotRadius, radiusRatio: options.radiusRatio })
          });
          ctx.globalAlpha = Number.isFinite(Number(options.dotAlpha)) ? Number(options.dotAlpha) : 0.9;
          ctx.beginPath();
          ctx.arc(dot.x, dot.y, dotRadius, 0, Math.PI * 2);
          ctx.fillStyle = options.dotStyle || "rgba(224, 67, 65, 0.9)";
          ctx.fill();
          if (options.dotStrokeStyle !== false) {
            ctx.strokeStyle = options.dotStrokeStyle || "rgba(14, 22, 30, 0.86)";
            ctx.lineWidth = options.dotStrokeWidth || Math.max(1, dotRadius * 0.22);
            ctx.stroke();
          }
          ctx.restore();
          return { rect: pad, center, radius, dot };
        }
        function drawPowerController(ctx, rect, state = {}, assets = {}, options = {}) {
          const bounds = rectFrom(rect);
          PowerController.drawPowerController(ctx, bounds, state, assets, options);
          return { rect: bounds };
        }
        function formatPowerValue(power) {
          const value = ShotControl.resolvedShotPower(power);
          return String(Math.round(value));
        }
        function drawPowerValue(ctx, rect, state = {}, options = {}) {
          if (options.visible === false) return null;
          const bounds = rectFrom(rect);
          const value = Math.max(0, Math.min(100, Number(state.power) || 0));
          const width = Number.isFinite(Number(options.width)) ? Number(options.width) : Math.min(54, bounds.width * 0.72);
          const height = Number.isFinite(Number(options.height)) ? Number(options.height) : 28;
          const offsetX = Number.isFinite(Number(options.offsetX)) ? Number(options.offsetX) : 0;
          const offsetY = Number.isFinite(Number(options.offsetY)) ? Number(options.offsetY) : 0;
          const chip = {
            x: bounds.x + (bounds.width - width) * 0.5 + offsetX,
            y: bounds.y + Math.max(5, bounds.height * 0.025) + offsetY,
            width,
            height
          };
          ctx.save();
          ctx.globalAlpha = Number.isFinite(Number(options.alpha)) ? Number(options.alpha) : 0.95;
          ctx.fillStyle = options.fillStyle || "rgba(9, 14, 19, 0.66)";
          ctx.strokeStyle = options.strokeStyle || "rgba(244, 223, 149, 0.42)";
          ctx.lineWidth = Number.isFinite(Number(options.lineWidth)) ? Number(options.lineWidth) : 1;
          const radius = Math.min(7, chip.height * 0.5);
          ctx.beginPath();
          ctx.moveTo(chip.x + radius, chip.y);
          ctx.lineTo(chip.x + chip.width - radius, chip.y);
          ctx.quadraticCurveTo(chip.x + chip.width, chip.y, chip.x + chip.width, chip.y + radius);
          ctx.lineTo(chip.x + chip.width, chip.y + chip.height - radius);
          ctx.quadraticCurveTo(chip.x + chip.width, chip.y + chip.height, chip.x + chip.width - radius, chip.y + chip.height);
          ctx.lineTo(chip.x + radius, chip.y + chip.height);
          ctx.quadraticCurveTo(chip.x, chip.y + chip.height, chip.x, chip.y + chip.height - radius);
          ctx.lineTo(chip.x, chip.y + radius);
          ctx.quadraticCurveTo(chip.x, chip.y, chip.x + radius, chip.y);
          ctx.closePath();
          ctx.fill();
          if (options.strokeStyle !== false) ctx.stroke();
          ctx.fillStyle = options.textStyle || "#f4df95";
          ctx.font = options.font || "800 18px ui-monospace, SFMono-Regular, Menlo, monospace";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(formatPowerValue(value), chip.x + chip.width * 0.5, chip.y + chip.height * 0.5 + (Number(options.textOffsetY) || 1));
          ctx.restore();
          return chip;
        }
        function layoutShotControlPanel(rect, options = {}) {
          const panel = rectFrom(rect);
          const gap = Number.isFinite(Number(options.gap)) ? Number(options.gap) : 10;
          const padding = Number.isFinite(Number(options.padding)) ? Number(options.padding) : 0;
          const inner = {
            x: panel.x + padding,
            y: panel.y + padding,
            width: Math.max(1, panel.width - padding * 2),
            height: Math.max(1, panel.height - padding * 2)
          };
          const powerWidth = Math.max(
            58,
            Math.min(Number(options.powerWidth) || 86, inner.width * 0.48)
          );
          const tipSize = Math.max(
            72,
            Math.min(Number(options.tipSize) || 128, inner.width - powerWidth - gap, inner.height)
          );
          const tipPad = {
            x: inner.x,
            y: inner.y + (inner.height - tipSize) * 0.5,
            width: tipSize,
            height: tipSize
          };
          const powerPullTrack = {
            x: inner.x + inner.width - powerWidth,
            y: inner.y,
            width: powerWidth,
            height: inner.height
          };
          return {
            panel,
            tipPad,
            powerPullTrack
          };
        }
        function drawShotControlPanel(ctx, rect, state = {}, assets = {}, options = {}) {
          const layout = layoutShotControlPanel(rect, options);
          const tip = drawTipPad(ctx, layout.tipPad, {
            tipOffset: state.tipOffset
          }, options.tipPad || {});
          const power = drawPowerController(ctx, layout.powerPullTrack, {
            power: state.power,
            pullDistancePx: state.pullDistancePx,
            enabled: state.enabled
          }, assets, options.powerController || {});
          const powerValue = drawPowerValue(ctx, layout.powerPullTrack, {
            power: state.power
          }, options.powerValue || {});
          return {
            ...layout,
            tip,
            power,
            powerValue
          };
        }
        function hitTestShotControl(point, layout) {
          if (pointInRect(point, layout?.tipPad)) return "tip";
          if (pointInRect(point, layout?.powerPullTrack)) return "power";
          return null;
        }
        return {
          DEFAULT_TIP_PAD_FILL_ALPHA,
          DEFAULT_TIP_RADIUS_RATIO,
          drawPowerController,
          drawPowerValue,
          formatPowerValue,
          drawShotControlPanel,
          drawTipPad,
          hitTestShotControl,
          layoutShotControlPanel,
          pointInRect,
          tipPadMetrics,
          tipPadOffsetScale
        };
      });
    }
  });

  // apps/three-game/trial/side-anchors.cjs
  var require_side_anchors = __commonJS({
    "apps/three-game/trial/side-anchors.cjs"(exports, module) {
      var { powerGeometry } = require_power_geometry();
      var { tipPadMetrics } = require_shotControlRenderer();
      function anchorShotControls(layout, { device, width, height, safeLeft = 0, safeRight = 0, designWidth = 1920, designHeight = 1080, compactMobile = false }) {
        const scale = Math.min(width / designWidth, height / designHeight), offsetX = (width - designWidth * scale) / 2;
        const result = { ...layout };
        for (const key of ["tipPad", "powerPull"]) {
          const r = layout[key];
          if (!r) continue;
          if (key === "powerPull") {
            const hitWidth = powerGeometry(r, device === "mobile").rect.width;
            result[key] = { ...r, x: (width - safeRight - offsetX) / scale - hitWidth };
            continue;
          }
          const side = r.horizontalAnchor || (device === "mobile" && key === "tipPad" ? "left" : "right");
          const inset = Number.isFinite(r.sideInset) ? Math.max(0, r.sideInset) : Math.max(0, side === "left" ? r.x : designWidth - r.x - r.width);
          const pixelX = side === "left" ? safeLeft + inset * scale : width - safeRight - (inset + r.width) * scale;
          result[key] = { ...r, x: (pixelX - offsetX) / scale };
        }
        if (device === "desktop" && result.tipPad && result.powerPull) {
          const power = powerGeometry(result.powerPull, false);
          result.tipPad = { ...result.tipPad, x: power.rect.x + (power.containerWidth - result.tipPad.width) / 2 };
        }
        if (device === "mobile" && compactMobile && result.tipPad && result.powerPull) {
          const baseline = anchorShotControls(layout, { device, width, height, safeLeft, safeRight, designWidth, designHeight });
          const oldTip = baseline.tipPad;
          const previousDiameter = Math.min(oldTip.width, oldTip.height) * 0.6;
          const previousSize = previousDiameter / 2 >= 26 ? previousDiameter / 0.8736 : (previousDiameter - 2) / 0.84;
          const previousY = oldTip.y + (oldTip.height - previousSize) / 2;
          const previousRadius = tipPadMetrics({ width: previousSize, height: previousSize }).radius;
          const previousOuter = previousRadius + Math.max(2, previousRadius * 0.08) / 2;
          const diameter = previousDiameter * 1.2;
          const size = diameter / 2 >= 26 ? diameter / 0.8736 : (diameter - 2) / 0.84;
          const centerX = (safeLeft + diameter * scale / 2 - offsetX) / scale;
          const radius = tipPadMetrics({ width: size, height: size }).radius;
          const outer = radius + Math.max(2, radius * 0.08) / 2;
          const previousVisibleBottom = previousY + previousSize / 2 + previousOuter;
          const power = result.powerPull, oldJoystickSize = 2 * previousOuter;
          const oldJoystickTop = previousY - oldJoystickSize - 16 / scale;
          const oldVisualScale = (previousVisibleBottom - oldJoystickTop) / (power.height - 4);
          result.powerPull = { ...power, visualScale: oldVisualScale, y: previousVisibleBottom - (power.height - 4.5) * oldVisualScale };
          result.tipPad = {
            ...oldTip,
            x: centerX - size / 2,
            y: previousVisibleBottom - size / 2 - outer,
            width: size,
            height: size,
            joystickGapPx: 16 + (previousSize / 2 - previousOuter) * scale,
            joystickSizePx: 2 * previousOuter * scale
          };
        }
        if (device === "mobile" && !compactMobile && result.tipPad && result.powerPull) {
          const tip = result.tipPad, { radius } = tipPadMetrics(tip);
          const visibleBottom = tip.y + tip.height / 2 + radius + Math.max(2, radius * 0.08) / 2;
          const power = result.powerPull;
          const joystickSize = Math.min(tip.width, tip.height) * 0.6;
          const joystickTop = tip.y - joystickSize - 16 / scale;
          const visualScale = (visibleBottom - joystickTop) / (power.height - 4);
          result.powerPull = { ...power, visualScale, y: visibleBottom - (power.height - 4.5) * visualScale };
        }
        if (device === "mobile" && compactMobile) {
          if (result.tipPad) {
            const tip = result.tipPad, { radius } = tipPadMetrics(tip), outer = radius + Math.max(2, radius * 0.08) / 2;
            result.tipPad = { ...tip, x: (safeLeft - offsetX) / scale - tip.width / 2 + outer };
          }
          if (result.powerPull) {
            const power = result.powerPull, g = powerGeometry(power, device === "mobile");
            result.powerPull = { ...power, x: (width - safeRight - offsetX) / scale - g.containerWidth - 0.5 * (power.visualScale || 1) };
          }
        }
        return result;
      }
      module.exports = { anchorShotControls };
    }
  });

  // apps/three-game/src/render/hud/valueChipRenderer.js
  var require_valueChipRenderer = __commonJS({
    "apps/three-game/src/render/hud/valueChipRenderer.js"(exports, module) {
      (function installValueChipRenderer(root, factory) {
        let CanvasPrimitives = root?.SnookerCanvasPrimitives || null;
        if (typeof module === "object" && module.exports) {
          CanvasPrimitives = CanvasPrimitives || require_canvasPrimitives();
        }
        const api = factory(CanvasPrimitives);
        if (typeof module === "object" && module.exports) {
          module.exports = api;
        }
        if (root) {
          root.SnookerValueChipRenderer = api;
        }
      })(typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : exports, function createValueChipRenderer(CanvasPrimitives) {
        function drawValueChip(ctx, rect, text, options = {}) {
          const value = String(text ?? "");
          if (!options.forceVisible && value.length === 0) return false;
          ctx.save();
          ctx.shadowColor = options.shadowColor || "rgba(0, 0, 0, 0.5)";
          ctx.shadowBlur = Number.isFinite(Number(options.shadowBlur)) ? Number(options.shadowBlur) : 10;
          ctx.fillStyle = options.background || "rgba(13, 18, 24, 0.88)";
          ctx.strokeStyle = options.border || "rgba(238, 196, 79, 0.72)";
          ctx.lineWidth = Number.isFinite(Number(options.lineWidth)) ? Number(options.lineWidth) : 1.4;
          CanvasPrimitives.roundRect(ctx, rect, Number.isFinite(Number(options.radius)) ? Number(options.radius) : 8);
          ctx.fill();
          if (options.border !== false) ctx.stroke();
          ctx.shadowBlur = 0;
          ctx.fillStyle = options.color || "#f7f1df";
          ctx.font = options.font || "800 22px system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(value, rect.x + rect.width * 0.5, rect.y + rect.height * 0.5 + (Number(options.textOffsetY) || 0));
          ctx.restore();
          return true;
        }
        return {
          drawValueChip
        };
      });
    }
  });

  // apps/three-game/src/render/hud/shotControlsHudRenderer.js
  var require_shotControlsHudRenderer = __commonJS({
    "apps/three-game/src/render/hud/shotControlsHudRenderer.js"(exports, module) {
      (function installShotControlsHudRenderer(root, factory) {
        let CanvasPrimitives = root?.SnookerCanvasPrimitives || null;
        let ValueChipRenderer = root?.SnookerValueChipRenderer || null;
        let ShotControlRenderer = root?.SnookerShotControlRenderer || root?.TestFieldShotControlRenderer || null;
        if (typeof module === "object" && module.exports) {
          CanvasPrimitives = CanvasPrimitives || require_canvasPrimitives();
          ValueChipRenderer = ValueChipRenderer || require_valueChipRenderer();
          ShotControlRenderer = ShotControlRenderer || require_shotControlRenderer();
        }
        const api = factory(CanvasPrimitives, ValueChipRenderer, ShotControlRenderer);
        if (typeof module === "object" && module.exports) {
          module.exports = api;
        }
        if (root) {
          root.SnookerShotControlsHudRenderer = api;
          root.SnookerGameShotControlsRenderer = api;
        }
      })(typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : exports, function createShotControlsHudRenderer(CanvasPrimitives, ValueChipRenderer, ShotControlRenderer) {
        const POWER_SEGMENT_COLORS = ["#1fb6ff", "#f1d72c", "#ff8a10", "#e50012"];
        function clamp(value, min, max) {
          const number = Number(value);
          if (!Number.isFinite(number)) return min;
          return Math.max(min, Math.min(max, number));
        }
        function drawPowerMeter(ctx, rect, power, options = {}) {
          if (options.visible === false) return false;
          const ratio = clamp(power / 100, 0, 1);
          const activeIndex = Math.min(3, Math.floor(Math.max(0, power - 1e-4) / 25));
          const fillWidth = rect.width * ratio;
          ctx.save();
          ctx.shadowColor = "rgba(0, 0, 0, 0.55)";
          ctx.shadowBlur = 8;
          ctx.save();
          CanvasPrimitives.roundRect(ctx, rect, 4);
          ctx.clip();
          if (fillWidth > 0) {
            ctx.fillStyle = POWER_SEGMENT_COLORS[activeIndex];
            ctx.fillRect(rect.x, rect.y, fillWidth, rect.height);
          }
          ctx.restore();
          ctx.shadowBlur = 0;
          ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
          ctx.lineWidth = 2;
          CanvasPrimitives.roundRect(ctx, rect, 4);
          ctx.stroke();
          for (let index = 1; index < 4; index += 1) {
            const x = rect.x + rect.width * index / 4;
            ctx.beginPath();
            ctx.moveTo(x, rect.y);
            ctx.lineTo(x, rect.y + rect.height);
            ctx.stroke();
          }
          ctx.restore();
          return true;
        }
        function powerValueChipRect(rect, options = {}) {
          return {
            x: rect.x + rect.width * 0.5 - (Number(options.width) || 76) * 0.5 + (Number(options.offsetX) || 0),
            y: rect.y - (Number(options.offsetY) || 42),
            width: Number(options.width) || 76,
            height: Number(options.height) || 34
          };
        }
        function drawPowerValueChip(ctx, rect, power, options = {}) {
          if (options.visible === false || !options.forceVisible && power <= 0) return false;
          const chip = powerValueChipRect(rect, options);
          const drawn = ValueChipRenderer.drawValueChip(ctx, chip, ShotControlRenderer.formatPowerValue(power), {
            textOffsetY: 1,
            ...options.chip || {}
          });
          return drawn ? chip : false;
        }
        function drawPowerPullControl(ctx, rect, options = {}) {
          const power = ShotControlRenderer.drawPowerController(ctx, rect, {
            enabled: options.enabled !== false,
            power: options.power,
            pullDistancePx: options.powerPullDistancePx
          }, options.assets || {});
          const powerValue = drawPowerValueChip(ctx, rect, options.power, options.powerValue || {});
          return {
            power,
            powerPullTrack: rect,
            powerValue
          };
        }
        function drawTipPad(ctx, rect, tipOffset, options = {}) {
          const tip = ShotControlRenderer.drawTipPad(ctx, rect, { tipOffset }, options);
          return {
            tip,
            tipPad: rect
          };
        }
        function tipMagnifierRect(sourceTipPad, coreWidth, coreHeight, scale = 2, center = null) {
          const diameter = Math.max(1, Math.min(
            Number(sourceTipPad?.width) || 1,
            Number(sourceTipPad?.height) || 1
          ) * Math.max(1, Number(scale) || 2));
          const centerX = Number.isFinite(Number(center?.x)) ? Number(center.x) : (Number(coreWidth) || 0) * 0.5;
          const centerY = Number.isFinite(Number(center?.y)) ? Number(center.y) : (Number(coreHeight) || 0) * 0.5;
          return {
            x: centerX - diameter * 0.5,
            y: centerY - diameter * 0.5,
            width: diameter,
            height: diameter
          };
        }
        function tipMagnifierCenterLeftOfSource(sourceTipPad, scale = 2, gap = 100) {
          const sourceMetrics = ShotControlRenderer.tipPadMetrics(sourceTipPad);
          const sourceCenter = {
            x: sourceMetrics.pad.x + sourceMetrics.pad.width * 0.5,
            y: sourceMetrics.pad.y + sourceMetrics.pad.height * 0.5
          };
          return {
            x: sourceCenter.x - sourceMetrics.radius - sourceMetrics.radius * Math.max(1, Number(scale) || 2) - Math.max(0, Number(gap) || 0),
            y: sourceCenter.y
          };
        }
        function drawTipMagnifier(ctx, sourceTipPad, tipOffset, options = {}) {
          const center = options.center || tipMagnifierCenterLeftOfSource(
            sourceTipPad,
            options.scale,
            options.gap
          );
          const rect = tipMagnifierRect(
            sourceTipPad,
            options.coreWidth,
            options.coreHeight,
            options.scale,
            center
          );
          const sourceMetrics = ShotControlRenderer.tipPadMetrics(sourceTipPad);
          const dotScale = Math.max(0.01, Number(options.dotScale) || 1);
          const dotRadius = sourceMetrics.dotRadius * dotScale;
          drawTipPad(ctx, rect, tipOffset, {
            dotRadius,
            dotStrokeWidth: Math.max(1, dotRadius * 0.22) * 0.7
          });
          return rect;
        }
        function drawGameShotControls(ctx, options = {}) {
          const tableRect = options.tableRect;
          const powerPullTrack = options.createPowerPullRect(tableRect);
          const tipPad = options.createTipPadRect(tableRect);
          const powerEnabled = options.powerEnabled ?? options.enabled;
          const tipEnabled = options.tipEnabled ?? options.enabled;
          if (options.powerPullVisible !== false) {
            drawPowerPullControl(ctx, powerPullTrack, {
              assets: options.assets,
              enabled: powerEnabled,
              power: options.power,
              powerPullDistancePx: options.powerPullDistancePx,
              powerValue: options.powerValue
            });
          }
          drawPowerMeter(ctx, options.createPowerMeterRect(tableRect), options.power, {
            visible: options.powerMeterVisible !== false && options.powerIndicatorVisible
          });
          if (options.tipPadVisible !== false) {
            const tipPadMetrics = ShotControlRenderer.tipPadMetrics(tipPad);
            drawTipPad(ctx, tipPad, options.tipOffset, {
              dotStrokeWidth: Math.max(1, tipPadMetrics.dotRadius * 0.22) * 0.7,
              ...tipEnabled === false ? {
                alpha: 0.38,
                dotAlpha: 0.46
              } : {}
            });
          }
          return {
            powerPullTrack: options.powerPullVisible === false ? null : powerPullTrack,
            tipPad: options.tipPadVisible === false ? null : tipPad
          };
        }
        return {
          POWER_SEGMENT_COLORS,
          drawGameShotControls,
          drawPowerMeter,
          drawPowerPullControl,
          drawPowerValueChip,
          drawTipMagnifier,
          drawTipPad,
          powerValueChipRect,
          tipMagnifierCenterLeftOfSource,
          tipMagnifierRect
        };
      });
    }
  });

  // apps/three-game/trial/notifications.cjs
  var require_notifications = __commonJS({
    "apps/three-game/trial/notifications.cjs"(exports, module) {
      var { drawToast } = require_canvasControlsRenderer();
      function drawRuleToast(ctx, options = {}) {
        const {
          maximumWidth,
          sizeScale = 1,
          opacity = 1,
          rect,
          text = "",
          tone = "",
          yOffset = 0
        } = options;
        if (!rect || !text) return false;
        const fittedRect = fitMessageToastRect(ctx, {
          x: rect.x,
          y: rect.y + yOffset,
          width: rect.width,
          height: rect.height
        }, text, { maximumWidth, fontSize: 23 * sizeScale, horizontalPadding: 44 * sizeScale, minimumWidth: 80 * sizeScale });
        drawToast(ctx, fittedRect, text, {
          horizontalPadding: 44 * sizeScale,
          fontSize: 23 * sizeScale,
          minFontSize: 17 * sizeScale,
          radius: 8 * sizeScale,
          opacity,
          stroke: false,
          textAlign: "left"
        });
        return true;
      }
      function measureMessageText(ctx, text, fontSize = 23) {
        ctx.save();
        ctx.font = `700 ${fontSize}px system-ui, -apple-system, BlinkMacSystemFont, sans-serif`;
        const width = ctx.measureText(String(text || "")).width;
        ctx.restore();
        return width;
      }
      function fitMessageToastRect(ctx, maxRect, text, options = {}) {
        const horizontalPadding = Number(options.horizontalPadding) || 44;
        const maximumWidth = Math.max(maxRect.width, Number(options.maximumWidth) || maxRect.width);
        const minimumWidth = Math.min(maximumWidth, Number(options.minimumWidth) || 80);
        const width = Math.min(
          maximumWidth,
          Math.max(minimumWidth, Math.ceil(measureMessageText(ctx, text, Number(options.fontSize) || 23) + horizontalPadding))
        );
        return {
          ...maxRect,
          x: maxRect.x + (maxRect.width - width) * 0.5,
          width
        };
      }
      module.exports = { drawRuleToast };
    }
  });

  // apps/three-game/src/core/rules/scoring.js
  var require_scoring = __commonJS({
    "apps/three-game/src/core/rules/scoring.js"(exports, module) {
      function ballValue(kind) {
        const values = {
          red: 1,
          yellow: 2,
          green: 3,
          brown: 4,
          blue: 5,
          pink: 6,
          black: 7
        };
        return values[kind] || 0;
      }
      module.exports = {
        ballValue
      };
    }
  });

  // apps/three-game/src/core/rules/ruleSettingsAdapter.js
  var require_ruleSettingsAdapter = __commonJS({
    "apps/three-game/src/core/rules/ruleSettingsAdapter.js"(exports, module) {
      (function installRuleSettingsAdapter(root, factory) {
        const api = factory();
        if (typeof module === "object" && module.exports) {
          module.exports = api;
        }
        if (root) {
          root.SnookerRuleSettingsAdapter = api;
        }
      })(typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : exports, function createRuleSettingsAdapter() {
        const MISS_MODE = {
          OFF: "off",
          LIMITED_THREE: "limited3",
          UNLIMITED: "unlimited"
        };
        function clampNumber(value, min, max, fallback = min) {
          const number = Number(value);
          if (!Number.isFinite(number)) return fallback;
          return Math.max(min, Math.min(max, number));
        }
        function createDefaultRuleSettings(overrides = {}) {
          return {
            missMode: MISS_MODE.LIMITED_THREE,
            missLimit: 3,
            autoInferColorChoice: true,
            autoInferFreeBall: true,
            requireNominationWhenSnookered: true,
            touchingBallToleranceMm: 0.1,
            shotClockSeconds: 60,
            timeoutPenalty: 4,
            ...overrides
          };
        }
        function normalizeRuleSettings(settings = {}) {
          const missMode = Object.values(MISS_MODE).includes(settings.missMode) ? settings.missMode : MISS_MODE.LIMITED_THREE;
          const missLimit = Math.max(1, Math.round(Number(settings.missLimit) || 3));
          return createDefaultRuleSettings({
            ...settings,
            missMode,
            missLimit: missMode === MISS_MODE.LIMITED_THREE ? missLimit : Math.max(1, Math.round(Number(settings.missLimit) || 3))
          });
        }
        function missLimitModeFromRuleSettings(settings = {}) {
          const normalized = normalizeRuleSettings(settings);
          if (normalized.missMode === MISS_MODE.OFF) return "off";
          if (normalized.missMode === MISS_MODE.UNLIMITED) return "unlimited";
          return Number(normalized.missLimit) <= 1 ? "one" : "three";
        }
        function ruleSettingsFromRuleValues(values = {}) {
          const defaults = createDefaultRuleSettings();
          const missLimitMode = ["off", "one", "three", "unlimited"].includes(values.missLimitMode) ? values.missLimitMode : "three";
          return normalizeRuleSettings({
            matchRulesEnabled: Boolean(values.matchRulesEnabled),
            autoInferColorChoice: values.autoInferColorChoice !== false,
            illegalAimHintEnabled: values.illegalAimHintEnabled !== false,
            autoInferFreeBall: values.autoInferFreeBall !== false,
            requireNominationWhenSnookered: values.requireNominationWhenSnookered !== false,
            touchingBallToleranceMm: clampNumber(values.touchingBallToleranceMm, 0, 0.1, defaults.touchingBallToleranceMm),
            shotClockSeconds: clampNumber(values.shotClockSeconds, 8, 180, defaults.shotClockSeconds),
            timeoutPenalty: clampNumber(values.timeoutPenalty, 4, 7, defaults.timeoutPenalty),
            missMode: missLimitMode === "off" ? MISS_MODE.OFF : missLimitMode === "unlimited" ? MISS_MODE.UNLIMITED : MISS_MODE.LIMITED_THREE,
            missLimit: missLimitMode === "one" ? 1 : 3
          });
        }
        function ruleValuesFromRuleSettings(settings = {}, matchRulesEnabled = false) {
          const normalized = normalizeRuleSettings(settings);
          return {
            matchRulesEnabled: Boolean(matchRulesEnabled),
            autoInferColorChoice: Boolean(normalized.autoInferColorChoice),
            illegalAimHintEnabled: normalized.illegalAimHintEnabled !== false,
            autoInferFreeBall: Boolean(normalized.autoInferFreeBall),
            requireNominationWhenSnookered: Boolean(normalized.requireNominationWhenSnookered),
            missLimitMode: missLimitModeFromRuleSettings(normalized),
            touchingBallToleranceMm: normalized.touchingBallToleranceMm,
            shotClockSeconds: normalized.shotClockSeconds,
            timeoutPenalty: normalized.timeoutPenalty
          };
        }
        return {
          MISS_MODE,
          createDefaultRuleSettings,
          missLimitModeFromRuleSettings,
          normalizeRuleSettings,
          ruleSettingsFromRuleValues,
          ruleValuesFromRuleSettings
        };
      });
    }
  });

  // apps/three-game/src/core/rules/ruleSnapshot.js
  var require_ruleSnapshot = __commonJS({
    "apps/three-game/src/core/rules/ruleSnapshot.js"(exports, module) {
      function cloneJson(value) {
        return JSON.parse(JSON.stringify(value));
      }
      function sanitizeRestoreSnapshot(snapshot) {
        if (!snapshot || typeof snapshot !== "object") return null;
        return {
          balls: cloneJson(snapshot.balls || []),
          players: cloneJson(snapshot.players || []),
          currentPlayerId: snapshot.currentPlayerId || null,
          targetMode: snapshot.targetMode || null,
          ruleState: sanitizeRuleStateSnapshot(snapshot.ruleState, { includePendingRestore: false }),
          frameOver: Boolean(snapshot.frameOver),
          matchOver: Boolean(snapshot.matchOver)
        };
      }
      function sanitizePendingDecision(pendingDecision, options = {}) {
        if (!pendingDecision || typeof pendingDecision !== "object") return null;
        const { restoreSnapshot, ...rest } = pendingDecision;
        const sanitized = cloneJson(rest);
        if (options.includeRestore && restoreSnapshot) {
          sanitized.restoreSnapshot = sanitizeRestoreSnapshot(restoreSnapshot);
        } else if ("restoreSnapshot" in pendingDecision) {
          sanitized.restoreSnapshot = null;
        }
        return sanitized;
      }
      function sanitizeRuleStateSnapshot(ruleState, options = {}) {
        if (!ruleState || typeof ruleState !== "object") return null;
        const {
          lastRuleResult,
          pendingDecision,
          ...rest
        } = ruleState;
        const sanitized = cloneJson(rest);
        sanitized.pendingDecision = sanitizePendingDecision(pendingDecision, {
          includeRestore: options.includePendingRestore === true
        });
        if (lastRuleResult && typeof lastRuleResult === "object") {
          const { pendingDecision: resultPendingDecision, ...resultRest } = lastRuleResult;
          sanitized.lastRuleResult = {
            ...cloneJson(resultRest),
            pendingDecision: sanitizePendingDecision(resultPendingDecision, { includeRestore: false })
          };
        } else {
          sanitized.lastRuleResult = null;
        }
        return sanitized;
      }
      function createPreShotSnapshot(state) {
        return {
          balls: cloneJson(state.balls || []),
          players: cloneJson(state.players || []),
          currentPlayerId: state.currentPlayerId,
          targetMode: state.targetMode,
          // A pre-shot restore point must not retain older restore points. Without
          // this boundary every foul can embed the previous foul snapshot again,
          // causing exponential match:state payload growth and transport framing
          // failures after several fouls.
          ruleState: sanitizeRuleStateSnapshot(state.ruleState, { includePendingRestore: false }),
          frameOver: Boolean(state.frameOver),
          matchOver: Boolean(state.matchOver)
        };
      }
      function restoreBallsFromSnapshot(state, snapshot) {
        if (!snapshot || !Array.isArray(snapshot.balls)) {
          return;
        }
        state.balls = cloneJson(snapshot.balls);
      }
      module.exports = {
        createPreShotSnapshot,
        restoreBallsFromSnapshot,
        sanitizeRuleStateSnapshot
      };
    }
  });

  // apps/three-game/src/core/rules/scoreAvailability.js
  var require_scoreAvailability = __commonJS({
    "apps/three-game/src/core/rules/scoreAvailability.js"(exports, module) {
      var { BALL_KIND } = require_constants();
      var { ballValue } = require_scoring();
      function availablePointsForPlayer(state, playerId) {
        const balls = (state?.balls || []).filter((ball) => !ball.potted);
        const reds = balls.filter((ball) => ball.kind === BALL_KIND.RED).length;
        const colors = balls.filter((ball) => ball.kind !== BALL_KIND.CUE && ball.kind !== BALL_KIND.RED);
        const base = reds > 0 ? reds * 8 + 27 : colors.reduce((sum, ball) => sum + ballValue(ball.kind), 0);
        const rule = state?.ruleState || {};
        const owesColor = rule.phase === "colorChoice" || rule.colorAfterLastRedDue;
        return base + (owesColor && state.currentPlayerId === playerId ? 7 : 0);
      }
      function playerRequiresSnookers(state, playerId) {
        const player = state?.players?.find((player2) => player2.id === playerId);
        const opponent = state?.players?.find((player2) => player2.id !== playerId);
        return Boolean(player && opponent && Number(opponent.score) - Number(player.score) > availablePointsForPlayer(state, playerId));
      }
      function anyPlayerRequiresSnookers(state) {
        return (state?.players || []).some((player) => playerRequiresSnookers(state, player.id));
      }
      module.exports = { availablePointsForPlayer, playerRequiresSnookers, anyPlayerRequiresSnookers };
    }
  });

  // apps/three-game/src/core/rules/snookerGeometry.js
  var require_snookerGeometry = __commonJS({
    "apps/three-game/src/core/rules/snookerGeometry.js"(exports, module) {
      var { BALL_RADIUS_MM } = require_ballSpec();
      var { BAULK_LINE_X_MM, D_RADIUS_MM } = require_tableModel();
      var EPS = 1e-7;
      var SEARCH_TOLERANCE_MM = 1e-4;
      var radiusOf = (ball) => ball.radius || BALL_RADIUS_MM;
      var distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
      function segmentDistance(point, start, end) {
        const dx = end.x - start.x, dy = end.y - start.y;
        const lengthSq = dx * dx + dy * dy;
        const t = lengthSq > EPS * EPS ? Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSq)) : 0;
        return Math.hypot(point.x - start.x - t * dx, point.y - start.y - t * dy);
      }
      function extremeContacts(pos, target, cueRadius) {
        const dx = pos.x - target.pos.x, dy = pos.y - target.pos.y;
        const d = Math.hypot(dx, dy), r = cueRadius + radiusOf(target);
        if (d <= r + EPS) return [pos, pos];
        const along = r * r / (d * d);
        const across = r * Math.sqrt(d * d - r * r) / (d * d);
        return [-1, 1].map((sign) => ({
          x: target.pos.x + along * dx - sign * across * dy,
          y: target.pos.y + along * dy + sign * across * dx
        }));
      }
      function pathClearance(pos, end, cueRadius, blockers) {
        return blockers.reduce((clearance, ball) => Math.min(
          clearance,
          segmentDistance(ball.pos, pos, end) - cueRadius - radiusOf(ball)
        ), Infinity);
      }
      function edgeClearances(pos, target, cueRadius, blockers) {
        return extremeContacts(pos, target, cueRadius).map((end) => pathClearance(pos, end, cueRadius, blockers));
      }
      function hasBothEdgesClear(pos, target, cueRadius, blockers) {
        return edgeClearances(pos, target, cueRadius, blockers).every((value) => value >= -EPS);
      }
      function hasAnyContactClear(pos, target, cueRadius, blockers, slack = 0) {
        const dx = pos.x - target.pos.x, dy = pos.y - target.pos.y;
        const d = Math.hypot(dx, dy), r = cueRadius + radiusOf(target);
        if (d <= r + EPS || !blockers.length) return true;
        const arcs = [{ angle: Math.atan2(dy, dx), half: Math.acos(r / d) }];
        while (arcs.length) {
          const { angle, half } = arcs.pop();
          const end = { x: target.pos.x + r * Math.cos(angle), y: target.pos.y + r * Math.sin(angle) };
          const clearance = pathClearance(pos, end, cueRadius, blockers) + slack;
          if (clearance >= -EPS) return true;
          const motion = r * half;
          if (clearance + motion < -EPS) continue;
          if (motion <= SEARCH_TOLERANCE_MM) return true;
          const next = half / 2;
          arcs.push({ angle: angle - next, half: next }, { angle: angle + next, half: next });
        }
        return false;
      }
      function edgeMotionBound(pos, target, cueRadius, h) {
        const d = distance(pos, target.pos), r = cueRadius + radiusOf(target);
        if (d - h <= r) return Infinity;
        const angle = Math.acos(r / d);
        const angleChange = Math.asin(Math.min(1, h / d)) + Math.max(
          angle - Math.acos(r / (d - h)),
          Math.acos(r / (d + h)) - angle
        );
        return Math.max(h, r * angleChange);
      }
      function hasEscapeInD(state, cue, targets, blockers, objects, anyContact) {
        const markings = state.table?.markings?.dArea;
        const center = {
          x: state.table?.baulkLineMm ?? markings?.center?.x ?? BAULK_LINE_X_MM,
          y: markings?.center?.y ?? 0
        };
        const radius = state.table?.dRadiusMm ?? markings?.radius ?? D_RADIUS_MM;
        const cueRadius = radiusOf(cue);
        const valid = (pos) => pos.x <= center.x + EPS && distance(pos, center) <= radius + EPS && objects.every((ball) => distance(pos, ball.pos) >= cueRadius + radiusOf(ball) - EPS);
        const escape = (pos) => valid(pos) && targets.some((target) => anyContact ? hasAnyContactClear(pos, target, cueRadius, blockers) : hasBothEdgesClear(pos, target, cueRadius, blockers));
        if ([
          cue.pos,
          center,
          { x: center.x, y: center.y - radius },
          { x: center.x, y: center.y + radius },
          { x: center.x - radius, y: center.y }
        ].some(escape)) return true;
        const cells = [{ x: center.x - radius / 2, y: center.y, hx: radius / 2, hy: radius }];
        while (cells.length) {
          const cell = cells.pop();
          const pos = { x: cell.x, y: cell.y }, h = Math.hypot(cell.hx, cell.hy);
          const near = {
            x: Math.max(cell.x - cell.hx, Math.min(center.x, cell.x + cell.hx)),
            y: Math.max(cell.y - cell.hy, Math.min(center.y, cell.y + cell.hy))
          };
          if (distance(near, center) > radius + EPS) continue;
          if (objects.some((ball) => distance(pos, ball.pos) + h < cueRadius + radiusOf(ball) - EPS)) continue;
          if (escape(pos)) return true;
          if (targets.every((target) => {
            const bound = edgeMotionBound(pos, target, cueRadius, h);
            if (anyContact) return !hasAnyContactClear(pos, target, cueRadius, blockers, bound);
            return edgeClearances(pos, target, cueRadius, blockers).some((value) => value + bound < -EPS);
          })) continue;
          if (h <= SEARCH_TOLERANCE_MM) return true;
          if (cell.hx >= cell.hy) {
            const hx = cell.hx / 2;
            cells.push({ ...cell, x: cell.x - hx, hx }, { ...cell, x: cell.x + hx, hx });
          } else {
            const hy = cell.hy / 2;
            cells.push({ ...cell, y: cell.y - hy, hy }, { ...cell, y: cell.y + hy, hy });
          }
        }
        return false;
      }
      function targetsObstructed(state, cue, targetKinds, inHand, anyContact) {
        if (!cue || cue.potted && !inHand) return false;
        const objects = (state.balls || []).filter((ball) => !ball.potted && ball.id !== cue.id);
        const targets = objects.filter((ball) => targetKinds.includes(ball.kind));
        if (!targets.length) return false;
        const blockers = objects.filter((ball) => !targetKinds.includes(ball.kind));
        if (inHand) return !hasEscapeInD(state, cue, targets, blockers, objects, anyContact);
        const canHit = anyContact ? hasAnyContactClear : hasBothEdgesClear;
        return !targets.some((target) => canHit(cue.pos, target, radiusOf(cue), blockers));
      }
      function isSnookered(state, cue, targetKinds, inHand = false) {
        return targetsObstructed(state, cue, targetKinds, inHand, false);
      }
      function areTargetsFullyBlocked(state, cue, targetKinds, inHand = false) {
        return targetsObstructed(state, cue, targetKinds, inHand, true);
      }
      function effectiveSnookeringBalls(state, cue, targetKinds) {
        if (!cue || cue.potted) return [];
        const objects = (state.balls || []).filter((ball) => !ball.potted && ball.id !== cue.id);
        const targets = objects.filter((ball) => targetKinds.includes(ball.kind));
        const blockers = objects.filter((ball) => !targetKinds.includes(ball.kind));
        if (!targets.length) return [];
        let common = null;
        for (const target of targets) {
          const obstructing = blockers.filter((ball) => !hasBothEdgesClear(cue.pos, target, radiusOf(cue), [ball]));
          if (!obstructing.length) return [];
          const nearest = Math.min(...obstructing.map((ball) => distance(cue.pos, ball.pos)));
          const effective = obstructing.filter((ball) => distance(cue.pos, ball.pos) <= nearest + EPS);
          common = common === null ? effective : common.filter((ball) => effective.some((other) => other.id === ball.id));
          if (!common.length) return [];
        }
        return common || [];
      }
      module.exports = { areTargetsFullyBlocked, isSnookered, effectiveSnookeringBalls };
    }
  });

  // apps/three-game/src/core/aim/aimContactGeometry.js
  var require_aimContactGeometry = __commonJS({
    "apps/three-game/src/core/aim/aimContactGeometry.js"(exports, module) {
      (function installAimContactGeometry(root, factory) {
        const api = factory();
        if (typeof module === "object" && module.exports) {
          module.exports = api;
        }
        if (root) {
          root.SnookerAimContactGeometry = api;
        }
      })(typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : exports, function createAimContactGeometry() {
        function dot(a, b) {
          return a.x * b.x + a.y * b.y;
        }
        function sub(a, b) {
          return { x: a.x - b.x, y: a.y - b.y };
        }
        function rayCircleHit(origin, direction, center, radius, hitInfo = {}) {
          const offset = sub(origin, center);
          const b = 2 * dot(offset, direction);
          const c = dot(offset, offset) - radius * radius;
          if (c <= 0 && b >= 0) return null;
          const disc = b * b - 4 * c;
          if (disc < 0) return null;
          const root = Math.sqrt(disc);
          const t1 = (-b - root) / 2;
          const distance = c <= 0 ? 0 : t1 >= 0 ? t1 : null;
          if (distance === null) return null;
          return {
            ...hitInfo,
            distance,
            point: {
              x: origin.x + direction.x * distance,
              y: origin.y + direction.y * distance
            }
          };
        }
        function findNearestBallContact(origin, direction, balls = [], options = {}) {
          const movingRadius = Number(options.movingRadius) || 26.25;
          const defaultBallRadius = Number(options.defaultBallRadius) || 26.25;
          const ignoreBallIds = new Set(options.ignoreBallIds || []);
          const ignoreKinds = new Set(options.ignoreKinds || []);
          let best = options.maxDistance ? {
            distance: options.maxDistance,
            label: options.maxLabel || "max",
            type: "max",
            point: {
              x: origin.x + direction.x * options.maxDistance,
              y: origin.y + direction.y * options.maxDistance
            }
          } : null;
          (Array.isArray(balls) ? balls : []).forEach((ball) => {
            if (!ball || !ball.pos) return;
            if (!options.includePotted && ball.potted) return;
            if (ignoreBallIds.has(ball.id)) return;
            if (ignoreKinds.has(ball.kind)) return;
            const hit = rayCircleHit(
              origin,
              direction,
              ball.pos,
              movingRadius + (ball.radius || defaultBallRadius),
              {
                type: "ball",
                label: ball.id,
                ball
              }
            );
            if (hit && (!best || hit.distance < best.distance)) best = hit;
          });
          return best;
        }
        function pathLength(points = []) {
          if (!Array.isArray(points) || points.length < 2) return 0;
          let total = 0;
          for (let index = 1; index < points.length; index += 1) {
            total += Math.hypot(
              (points[index]?.x || 0) - (points[index - 1]?.x || 0),
              (points[index]?.y || 0) - (points[index - 1]?.y || 0)
            );
          }
          return total;
        }
        function hasDrawablePath(points, minLength = 4) {
          return pathLength(points) >= minLength;
        }
        function trimPredictionPath(points, maxLength) {
          if (!Array.isArray(points) || points.length <= 1) return points;
          const trimmed = [points[0]];
          let travelled = 0;
          for (let i = 1; i < points.length; i += 1) {
            const previous = trimmed[trimmed.length - 1];
            const current = points[i];
            const segmentLength = Math.hypot(current.x - previous.x, current.y - previous.y);
            if (travelled + segmentLength >= maxLength) {
              const remain = Math.max(0, maxLength - travelled);
              const ratio = segmentLength > 0 ? remain / segmentLength : 0;
              trimmed.push({
                x: previous.x + (current.x - previous.x) * ratio,
                y: previous.y + (current.y - previous.y) * ratio
              });
              return trimmed;
            }
            travelled += segmentLength;
            trimmed.push(current);
          }
          return trimmed;
        }
        function normalize2(vector) {
          const x = Number(vector?.x) || 0;
          const y = Number(vector?.y) || 0;
          const size = Math.hypot(x, y);
          return size > 1e-6 ? { x: x / size, y: y / size } : { x: 1, y: 0 };
        }
        function pathDirectionAt(points, index, fallbackDirection) {
          if (!Array.isArray(points) || points.length < 2) return fallbackDirection;
          const from = points[Math.max(0, Math.min(points.length - 2, index))];
          const to = points[Math.max(1, Math.min(points.length - 1, index + 1))];
          return normalize2(sub(to, from));
        }
        function truncatePredictionPath(points, lengthMm, fallbackDirection, options = {}) {
          if (lengthMm <= 0) return [];
          const source = Array.isArray(points) && points.length > 0 ? points : [];
          const start = source[0];
          if (!start) return [];
          const output = [{ ...start }];
          let travelled = 0;
          for (let i = 1; i < source.length; i += 1) {
            const previous = output[output.length - 1];
            const current = source[i];
            const segmentLength = Math.hypot(current.x - previous.x, current.y - previous.y);
            if (segmentLength <= 1e-3) continue;
            if (travelled + segmentLength >= lengthMm) {
              const remain2 = Math.max(0, lengthMm - travelled);
              const ratio = remain2 / segmentLength;
              output.push({
                x: previous.x + (current.x - previous.x) * ratio,
                y: previous.y + (current.y - previous.y) * ratio
              });
              return output;
            }
            travelled += segmentLength;
            output.push({ ...current });
          }
          const remain = lengthMm - travelled;
          if (remain > 1e-3) {
            const last = output[output.length - 1];
            const direction = fallbackDirection || (options.extendWithPathDirection ? pathDirectionAt(output, output.length - 2, { x: 1, y: 0 }) : { x: 1, y: 0 });
            output.push({
              x: last.x + direction.x * remain,
              y: last.y + direction.y * remain
            });
          }
          return output;
        }
        return {
          findNearestBallContact,
          hasDrawablePath,
          pathLength,
          rayCircleHit,
          trimPredictionPath,
          truncatePredictionPath
        };
      });
    }
  });

  // apps/three-game/src/core/rules/rulesEngine.js
  var require_rulesEngine = __commonJS({
    "apps/three-game/src/core/rules/rulesEngine.js"(exports, module) {
      var { BALL_KIND, COLOR_ORDER } = require_constants();
      var { BALL_RADIUS_MM } = require_ballSpec();
      var { colorSpot } = require_spotModel();
      var { ballValue } = require_scoring();
      var {
        MISS_MODE,
        createDefaultRuleSettings
      } = require_ruleSettingsAdapter();
      var {
        findCueBallDPosition,
        findRespottedColorPosition,
        isColorBallKind,
        resetBallToTable,
        respotPottedColorBalls,
        respotPottedCueBallInD
      } = require_respot();
      var { restoreBallsFromSnapshot } = require_ruleSnapshot();
      var { anyPlayerRequiresSnookers } = require_scoreAvailability();
      var { areTargetsFullyBlocked, isSnookered, effectiveSnookeringBalls } = require_snookerGeometry();
      var { rayCircleHit } = require_aimContactGeometry();
      var RULE_PHASE = {
        REDS: "reds",
        COLOR_CHOICE: "colorChoice",
        CLEARANCE: "clearance",
        FINAL_BLACK: "finalBlack",
        RESPOTTED_BLACK: "respottedBlack",
        FRAME_OVER: "frameOver"
      };
      var DECISION = {
        PLAY_SELF: "play-self",
        PLAY_AGAIN: "play-again",
        RESTORE_PLAY_AGAIN: "restore-play-again"
      };
      var BREAK_POT_KINDS = [
        BALL_KIND.RED,
        BALL_KIND.YELLOW,
        BALL_KIND.GREEN,
        BALL_KIND.BROWN,
        BALL_KIND.BLUE,
        BALL_KIND.PINK,
        BALL_KIND.BLACK
      ];
      function createBreakPotCounts() {
        return Object.fromEntries(BREAK_POT_KINDS.map((kind) => [kind, 0]));
      }
      function createInitialRuleState() {
        return {
          phase: RULE_PHASE.REDS,
          targetColorKind: null,
          cueBallInHand: true,
          currentBreak: 0,
          currentBreakPots: createBreakPotCounts(),
          pendingDecision: null,
          freeBallAvailable: false,
          freeBallKind: null,
          requiresNomination: false,
          nominationReason: null,
          nominatedColorKind: null,
          touchingBallIds: [],
          touchingBalls: [],
          missSequence: {
            count: 0,
            originalShotId: null
          },
          lastRuleResult: null
        };
      }
      function cloneJson(value) {
        return JSON.parse(JSON.stringify(value));
      }
      function getRuleSettings(state) {
        state.ruleSettings = {
          ...createDefaultRuleSettings(),
          ...state.ruleSettings || {}
        };
        return state.ruleSettings;
      }
      function ensureRuleState(state) {
        if (!state.ruleState) {
          state.ruleState = createInitialRuleState();
        }
        state.ruleState.currentBreakPots = {
          ...createBreakPotCounts(),
          ...state.ruleState.currentBreakPots || {}
        };
        return state.ruleState;
      }
      function activeBalls(state) {
        return (state.balls || []).filter((ball) => !ball.potted);
      }
      function getCueBall(state) {
        return (state.balls || []).find((ball) => ball.id === state.cueBallId || ball.kind === BALL_KIND.CUE);
      }
      function findBallById(state, id) {
        return (state.balls || []).find((ball) => ball.id === id) || null;
      }
      function isRedKind(kind) {
        return kind === BALL_KIND.RED;
      }
      function isColorKind(kind) {
        return isColorBallKind(kind);
      }
      function redCount(state) {
        return activeBalls(state).filter((ball) => isRedKind(ball.kind)).length;
      }
      function remainingTablePoints(state, ruleState = ensureRuleState(state)) {
        const reds = redCount(state);
        const colors = activeBalls(state).filter((ball) => isColorKind(ball.kind));
        const colorSequencePoints = colors.reduce((sum, ball) => sum + ballValue(ball.kind), 0);
        if (reds > 0) {
          const colorAfterRedPoints = ruleState.phase === RULE_PHASE.COLOR_CHOICE ? ballValue(BALL_KIND.BLACK) : 0;
          return reds * (ballValue(BALL_KIND.RED) + ballValue(BALL_KIND.BLACK)) + colorAfterRedPoints + 27;
        }
        if (ruleState.phase === RULE_PHASE.COLOR_CHOICE || ruleState.colorAfterLastRedDue) {
          return ballValue(BALL_KIND.BLACK) + colorSequencePoints;
        }
        return colorSequencePoints;
      }
      function anyPlayerRequiresPenaltyPoints(state, ruleState = ensureRuleState(state)) {
        const players = state.players || [];
        if (players.length < 2) return false;
        const remaining = remainingTablePoints(state, ruleState);
        const firstScore = Number(players[0].score) || 0;
        const secondScore = Number(players[1].score) || 0;
        return Math.abs(firstScore - secondScore) > remaining;
      }
      function firstActiveColorKind(state) {
        return COLOR_ORDER.find((kind) => activeBalls(state).some((ball) => ball.kind === kind)) || null;
      }
      function hasOnlyBlackObjectBall(state) {
        const objectBalls = activeBalls(state).filter((ball) => ball.kind !== BALL_KIND.CUE);
        return objectBalls.length === 1 && objectBalls[0].kind === BALL_KIND.BLACK;
      }
      function otherPlayerId(state, playerId) {
        return (state.players || []).find((player) => player.id !== playerId)?.id || playerId;
      }
      function findPlayer(state, playerId) {
        return (state.players || []).find((player) => player.id === playerId) || null;
      }
      function addPlayerScore(state, playerId, points) {
        const player = findPlayer(state, playerId);
        if (!player || points <= 0) return;
        player.score += points;
      }
      function addPlayerBreak(state, playerId, points) {
        const player = findPlayer(state, playerId);
        if (!player || points <= 0) return;
        player.break += points;
        ensureRuleState(state).currentBreak = player.break;
      }
      function addCurrentBreakPots(state, balls) {
        const ruleState = ensureRuleState(state);
        (balls || []).forEach((ball) => {
          if (!BREAK_POT_KINDS.includes(ball?.kind)) return;
          ruleState.currentBreakPots[ball.kind] = (ruleState.currentBreakPots[ball.kind] || 0) + 1;
        });
      }
      function resetBreak(state, playerId) {
        const player = findPlayer(state, playerId);
        if (player) player.break = 0;
        const ruleState = ensureRuleState(state);
        ruleState.currentBreak = 0;
        ruleState.currentBreakPots = createBreakPotCounts();
      }
      function getTargetColorKind(ruleState, state) {
        if (ruleState.targetColorKind) return ruleState.targetColorKind;
        return firstActiveColorKind(state);
      }
      function targetKindsForRule(ruleState, state) {
        if (ruleState.testFieldOpenTargets) return [...new Set(activeBalls(state).filter((ball) => ball.kind !== BALL_KIND.CUE).map((ball) => ball.kind))];
        switch (ruleState.phase) {
          case RULE_PHASE.REDS:
            return [BALL_KIND.RED];
          case RULE_PHASE.COLOR_CHOICE:
            return COLOR_ORDER.filter((kind) => activeBalls(state).some((ball) => ball.kind === kind));
          case RULE_PHASE.CLEARANCE:
            return [getTargetColorKind(ruleState, state)].filter(Boolean);
          case RULE_PHASE.FINAL_BLACK:
          case RULE_PHASE.RESPOTTED_BLACK:
            return [BALL_KIND.BLACK];
          default:
            return [];
        }
      }
      function isKindOn(ruleState, state, kind) {
        return targetKindsForRule(ruleState, state).includes(kind);
      }
      function normalizeShotRecord(shotRecord) {
        return {
          playerId: shotRecord?.playerId,
          firstContactBallId: shotRecord?.firstContactBallId ?? shotRecord?.physicsResult?.firstContactBallId ?? null,
          pottedBallIds: shotRecord?.pottedBallIds || shotRecord?.physicsResult?.pottedBallIds || [],
          cueBallPotted: Boolean(
            shotRecord?.cueBallPotted ?? shotRecord?.physicsResult?.cueBallPotted
          ),
          events: shotRecord?.events || [],
          preShotSnapshot: shotRecord?.preShotSnapshot || null,
          preShotRuleState: shotRecord?.preShotRuleState || shotRecord?.preShotSnapshot?.ruleState || null,
          shotInput: shotRecord?.shotInput || null
        };
      }
      function isSnookeredOnTargets(state, ruleState) {
        return isSnookered(
          state,
          getCueBall(state),
          targetKindsForRule(ruleState, state),
          ruleState.cueBallInHand ?? state.ruleState?.cueBallInHand ?? false
        );
      }
      function isSnookeredByBallKind(state, ruleState, blockerKind) {
        return effectiveSnookeringBalls(state, getCueBall(state), targetKindsForRule(ruleState, state)).some((ball) => ball.kind === blockerKind);
      }
      function detectTouchingBalls(state, ruleState, settings = getRuleSettings(state)) {
        const cueBall = getCueBall(state);
        if (!cueBall || cueBall.potted) return [];
        const tolerance = Math.min(0.1, Math.max(0, Number(settings.touchingBallToleranceMm) || 0));
        return activeBalls(state).filter((ball) => ball.id !== cueBall.id).filter((ball) => Math.hypot(ball.pos.x - cueBall.pos.x, ball.pos.y - cueBall.pos.y) < (ball.radius || BALL_RADIUS_MM) + (cueBall.radius || BALL_RADIUS_MM) + tolerance).map((ball) => ({
          ballId: ball.id,
          kind: ball.kind,
          isOn: isKindOn(ruleState, state, ball.kind)
        }));
      }
      function updateColorNomination(state) {
        const ruleState = state.ruleState;
        const needsTarget = !state.ruleSettings?.practiceAutoColorTarget && !state.frameOver && !ruleState.testFieldOpenTargets && !ruleState.pendingDecision && !ruleState.freeBallAvailable && !ruleState.nominatedColorKind && ruleState.phase === RULE_PHASE.COLOR_CHOICE && areTargetsFullyBlocked(state, getCueBall(state), targetKindsForRule(ruleState, state), ruleState.cueBallInHand);
        ruleState.requiresNomination = needsTarget;
        ruleState.nominationReason = ruleState.requiresNomination ? "snookered-color-choice" : null;
      }
      function updateTouchingBalls(state) {
        const ruleState = ensureRuleState(state);
        const touching = detectTouchingBalls(state, ruleState);
        ruleState.touchingBallIds = touching.map((entry) => entry.ballId);
        ruleState.touchingBalls = touching;
        return ruleState;
      }
      function prepareNextShotState(state) {
        const ruleState = updateTouchingBalls(state);
        updateColorNomination(state);
        return ruleState;
      }
      function inferShotTarget(state, ruleState, shot) {
        const firstContactBall = findBallById(state, shot.firstContactBallId);
        const firstKind = firstContactBall?.kind || null;
        const freeBallAvailable = Boolean(ruleState.freeBallAvailable);
        if (freeBallAvailable && firstKind && !isKindOn(ruleState, state, firstKind)) {
          const ballOnKinds = targetKindsForRule(ruleState, state);
          return {
            // The nominated physical ball is the legal first-contact target, but it
            // acquires the identity and value of the actual ball on. Keeping these
            // two concepts separate is essential in the colour clearance: a Blue
            // nominated for Yellow must score and display as Yellow, not Blue.
            targetKinds: [firstKind],
            targetKind: ballOnKinds[0] || null,
            freeBallKind: firstKind,
            source: "free-ball-inferred"
          };
        }
        if (ruleState.phase === RULE_PHASE.COLOR_CHOICE) {
          const nominated = ruleState.nominatedColorKind;
          if (nominated) {
            return {
              targetKinds: [nominated],
              targetKind: nominated,
              freeBallKind: null,
              source: "nominated-color"
            };
          }
          if (firstKind && isColorKind(firstKind)) {
            return {
              targetKinds: [firstKind],
              targetKind: firstKind,
              freeBallKind: null,
              source: "color-choice-inferred"
            };
          }
        }
        const targetKinds = targetKindsForRule(ruleState, state);
        return {
          targetKinds,
          targetKind: targetKinds[0] || null,
          freeBallKind: null,
          source: "rule-state"
        };
      }
      function wasTouchingTargetSatisfied(state, ruleState, shotTarget, shot) {
        return (ruleState.touchingBalls || []).some((entry) => shotTarget.targetKinds.includes(entry.kind) && isShotPlayedAwayFromTouchingBall(state, shot, entry.ballId));
      }
      function cueInvolvedInBallHit(state, event) {
        return event?.type === "ball-hit-ball" && (event.ballAId === state.cueBallId || event.ballBId === state.cueBallId);
      }
      function otherBallInCueHit(state, event) {
        if (!cueInvolvedInBallHit(state, event)) return null;
        return event.ballAId === state.cueBallId ? event.ballBId : event.ballAId;
      }
      function cueHitRail(event, cueBallId) {
        return (event?.type === "ball-hit-rail" || event?.type === "ball-hit-pocket-jaw") && event.ballId === cueBallId;
      }
      function normalizedShotDirection(shot) {
        const direction = shot?.shotInput?.direction;
        const x = Number(direction?.x);
        const y = Number(direction?.y);
        const length = Math.hypot(x, y);
        if (!Number.isFinite(length) || length <= 1e-6) return null;
        return { x: x / length, y: y / length };
      }
      function preShotBallById(shot, ballId) {
        return (shot?.preShotSnapshot?.balls || []).find((ball) => ball.id === ballId) || null;
      }
      function isShotPlayedAwayFromTouchingBall(state, shot, touchingBallId) {
        const cueBefore = preShotBallById(shot, state.cueBallId) || getCueBall(state);
        const touchingBefore = preShotBallById(shot, touchingBallId) || findBallById(state, touchingBallId);
        const direction = normalizedShotDirection(shot);
        if (!cueBefore?.pos || !touchingBefore?.pos || !direction) {
          return !shot.firstContactBallId;
        }
        const contactRadius = (cueBefore.radius || BALL_RADIUS_MM) + (touchingBefore.radius || BALL_RADIUS_MM);
        return !rayCircleHit(cueBefore.pos, direction, touchingBefore.pos, contactRadius);
      }
      function directlyPushedTouchingBall(state, shot, touchingBallId) {
        if (isShotPlayedAwayFromTouchingBall(state, shot, touchingBallId)) {
          return false;
        }
        if (shot.firstContactBallId && shot.firstContactBallId !== touchingBallId) {
          return false;
        }
        const events = Array.isArray(shot.events) ? shot.events : [];
        for (const event of events) {
          if (cueHitRail(event, state.cueBallId)) {
            return false;
          }
          const hitBallId = otherBallInCueHit(state, event);
          if (!hitBallId) continue;
          return hitBallId === touchingBallId;
        }
        return !shot.firstContactBallId || shot.firstContactBallId === touchingBallId;
      }
      function detectPushedTouchingTarget(state, ruleState, shot) {
        const ballId = (ruleState.touchingBallIds || []).find((id) => directlyPushedTouchingBall(state, shot, id));
        return ballId ? findBallById(state, ballId) : null;
      }
      function pottedBalls(state, shot) {
        return shot.pottedBallIds.map((id) => findBallById(state, id)).filter(Boolean);
      }
      function detectFouls(state, ruleState, shot, shotTarget) {
        const fouls = [];
        const firstContactBall = findBallById(state, shot.firstContactBallId);
        const potted = pottedBalls(state, shot);
        const pottedObjectBalls = potted.filter((ball) => ball.kind !== BALL_KIND.CUE);
        const touchingMoved = detectPushedTouchingTarget(state, ruleState, shot);
        const touchingSatisfied = wasTouchingTargetSatisfied(state, ruleState, shotTarget, shot);
        if (!touchingSatisfied) {
          if (!firstContactBall && !touchingMoved) {
            fouls.push({ code: "no-contact", kind: shotTarget.targetKind });
          } else if (firstContactBall && !shotTarget.targetKinds.includes(firstContactBall.kind)) {
            fouls.push({ code: "wrong-first-contact", kind: firstContactBall.kind });
          }
        }
        if (shot.cueBallPotted) {
          fouls.push({ code: "cue-ball-potted", kind: shotTarget.targetKind });
        }
        pottedObjectBalls.forEach((ball) => {
          const isFreeBall = shotTarget.freeBallKind && ball.kind === shotTarget.freeBallKind;
          const isTarget = shotTarget.targetKinds.includes(ball.kind);
          if (ruleState.phase === RULE_PHASE.REDS && isTarget) {
            return;
          }
          if (shotTarget.freeBallKind && (isFreeBall || isKindOn(ruleState, state, ball.kind))) {
            return;
          }
          if (ruleState.phase === RULE_PHASE.COLOR_CHOICE && isTarget) {
            return;
          }
          if ([RULE_PHASE.CLEARANCE, RULE_PHASE.FINAL_BLACK, RULE_PHASE.RESPOTTED_BLACK].includes(ruleState.phase) && isTarget) {
            return;
          }
          fouls.push({ code: "non-target-potted", kind: ball.kind });
        });
        if (touchingMoved) {
          fouls.push({ code: "touching-ball-moved", kind: touchingMoved.kind });
        }
        if (shotTarget.freeBallKind) {
          const pottedFreeOrTrueTarget = pottedObjectBalls.some((ball) => ball.kind === shotTarget.freeBallKind || isKindOn(ruleState, state, ball.kind));
          const onlyPinkAndBlackRemain = activeBalls(state).filter((ball) => ball.kind !== BALL_KIND.CUE).every((ball) => ball.kind === BALL_KIND.PINK || ball.kind === BALL_KIND.BLACK);
          if (!pottedFreeOrTrueTarget && !onlyPinkAndBlackRemain && isSnookeredByBallKind(state, ruleState, shotTarget.freeBallKind)) {
            fouls.push({ code: "free-ball-snooker", kind: shotTarget.targetKind });
          }
        }
        return fouls;
      }
      function calculatePenalty(fouls, shotTarget) {
        const values = [4];
        if (shotTarget.targetKind) values.push(ballValue(shotTarget.targetKind));
        fouls.forEach((foul) => {
          if (foul.kind) values.push(ballValue(foul.kind));
        });
        return Math.max(...values);
      }
      function createTimeoutFoul(state, playerId = state.currentPlayerId) {
        const ruleState = ensureRuleState(state);
        const penalty = [RULE_PHASE.FINAL_BLACK, RULE_PHASE.RESPOTTED_BLACK].includes(ruleState.phase) ? Math.max(ballValue(BALL_KIND.BLACK), getRuleSettings(state).timeoutPenalty || 4) : Math.max(4, getRuleSettings(state).timeoutPenalty || 4);
        const nonOffenderId = otherPlayerId(state, playerId);
        addPlayerScore(state, nonOffenderId, penalty);
        resetBreak(state, playerId);
        if ([RULE_PHASE.FINAL_BLACK, RULE_PHASE.RESPOTTED_BLACK].includes(ruleState.phase)) {
          const events = [];
          if (ruleState.phase === RULE_PHASE.RESPOTTED_BLACK) {
            awardFrame(state, nonOffenderId, "respotted-black-foul");
          } else {
            finishFinalBlack(state, playerId, true, events);
          }
          const winnerId = ruleState.lastRuleResult?.winnerId;
          const reason = ruleState.lastRuleResult?.reason;
          ruleState.lastRuleResult = {
            type: state.frameOver ? "frame-over" : "foul",
            foul: true,
            fouls: ["shot-clock-timeout"],
            foulDetails: [{ code: "shot-clock-timeout", kind: null }],
            miss: false,
            points: 0,
            penalty,
            pottedBallIds: [],
            firstContactBallId: null,
            nextPlayerId: null,
            nextTarget: targetKindsForRule(ruleState, state),
            pendingDecision: ruleState.pendingDecision,
            events,
            frameOver: Boolean(state.frameOver),
            winnerId: state.frameOver ? winnerId : null,
            reason: state.frameOver ? reason : "black-respotted"
          };
          prepareNextShotState(state);
          return { state, result: ruleState.lastRuleResult };
        }
        const nextRule = nextPhaseAfterFoul(state, ruleState);
        const pendingDecision = {
          type: "foul",
          offenderId: playerId,
          nonOffenderId,
          penalty,
          fouls: ["shot-clock-timeout"],
          foulDetails: [{ code: "shot-clock-timeout", kind: null }],
          miss: false,
          missMode: getRuleSettings(state).missMode,
          options: [DECISION.PLAY_AGAIN],
          nextRuleState: nextRule,
          restoreSnapshot: null,
          freeBallAvailableIfSelf: isSnookeredOnTargets(state, nextRule)
        };
        state.currentPlayerId = nonOffenderId;
        clearPostShotFlags(state);
        ruleState.pendingDecision = pendingDecision;
        ruleState.phase = nextRule.phase;
        ruleState.targetColorKind = nextRule.targetColorKind || null;
        ruleState.freeBallAvailable = false;
        ruleState.freeBallKind = null;
        ruleState.lastRuleResult = {
          foul: true,
          fouls: ["shot-clock-timeout"],
          foulDetails: pendingDecision.foulDetails,
          miss: false,
          points: 0,
          penalty,
          shotTarget: {
            targetKinds: targetKindsForRule(ruleState, state),
            targetKind: getTargetColorKind(ruleState, state),
            freeBallKind: null,
            source: "timeout"
          },
          pottedBallIds: [],
          firstContactBallId: null,
          nextPlayerId: null,
          nextTarget: targetKindsForRule(ruleState, state),
          pendingDecision,
          events: [],
          frameOver: Boolean(state.frameOver)
        };
        prepareNextShotState(state);
        return { state, result: ruleState.lastRuleResult };
      }
      function displayFoulCode(code) {
        const labels = {
          "no-contact": "\u672A\u78B0\u5230\u76EE\u6807\u7403",
          "wrong-first-contact": "\u5148\u78B0\u9519\u7403",
          "cue-ball-potted": "\u6BCD\u7403\u5165\u888B",
          "non-target-potted": "\u975E\u76EE\u6807\u7403\u5165\u888B",
          "touching-ball-moved": "\u8FDE\u51FB",
          "free-ball-snooker": "\u81EA\u7531\u7403\u5F62\u6210\u65AF\u8BFA\u514B",
          "shot-clock-timeout": "\u8D85\u65F6"
        };
        return labels[code] || code;
      }
      function calculateLegalScore(state, ruleState, shot, shotTarget) {
        const potted = pottedBalls(state, shot).filter((ball) => ball.kind !== BALL_KIND.CUE);
        if (shotTarget.freeBallKind) {
          const pottedFreeBall = potted.some((ball) => ball.kind === shotTarget.freeBallKind);
          const pottedTrueTargets = potted.filter((ball) => isKindOn(ruleState, state, ball.kind));
          if (ruleState.phase === RULE_PHASE.REDS) {
            return potted.filter((ball) => ball.kind === BALL_KIND.RED || ball.kind === shotTarget.freeBallKind).length;
          }
          return pottedFreeBall || pottedTrueTargets.length > 0 ? ballValue(shotTarget.targetKind) : 0;
        }
        if (ruleState.phase === RULE_PHASE.REDS) {
          return potted.filter((ball) => ball.kind === BALL_KIND.RED).length;
        }
        return potted.some((ball) => ball.kind === shotTarget.targetKind) ? ballValue(shotTarget.targetKind) : 0;
      }
      function shouldRespotColorAfterLegalShot(ruleState, kind, shotTarget) {
        if (!isColorKind(kind)) return false;
        if (shotTarget.freeBallKind && kind === shotTarget.freeBallKind) return true;
        if ([RULE_PHASE.REDS, RULE_PHASE.COLOR_CHOICE].includes(ruleState.phase)) return true;
        return false;
      }
      function respotSelectedPottedColors(state, kinds, reason) {
        const events = [];
        kinds.forEach((kind) => {
          const ball = (state.balls || []).find((candidate) => candidate.potted && candidate.kind === kind);
          if (!ball) return;
          const from = {
            potted: Boolean(ball.potted),
            pos: ball.pos ? { ...ball.pos } : null,
            pocketMode: ball.pocketMode || null
          };
          const pos = findRespottedColorPosition(state, ball);
          resetBallToTable(ball, pos);
          events.push({
            type: "color-respotted",
            reason,
            ballId: ball.id,
            kind: ball.kind,
            from,
            pos: { ...pos }
          });
        });
        return events;
      }
      function scoreDifference(state) {
        const [a, b] = state.players || [];
        return (a?.score || 0) - (b?.score || 0);
      }
      function awardFrame(state, winnerId, reason) {
        const winner = findPlayer(state, winnerId);
        if (winner) winner.frames = (winner.frames || 0) + 1;
        state.frameOver = true;
        const ruleState = ensureRuleState(state);
        ruleState.phase = RULE_PHASE.FRAME_OVER;
        ruleState.pendingDecision = null;
        ruleState.lastRuleResult = {
          type: "frame-over",
          winnerId,
          reason
        };
      }
      function endFrame(state, winnerId, reason = "manual") {
        awardFrame(state, winnerId, reason);
        return {
          state,
          result: ensureRuleState(state).lastRuleResult
        };
      }
      function handleRespottedBlack(state, currentPlayerId, foul, blackPotted = false) {
        const otherId = otherPlayerId(state, currentPlayerId);
        if (foul) {
          awardFrame(state, otherId, "respotted-black-foul");
          return;
        }
        if (blackPotted) {
          awardFrame(state, currentPlayerId, "respotted-black-potted");
          return;
        }
        resetBreak(state, currentPlayerId);
        state.currentPlayerId = otherId;
        const ruleState = ensureRuleState(state);
        ruleState.phase = RULE_PHASE.RESPOTTED_BLACK;
        ruleState.targetColorKind = BALL_KIND.BLACK;
        ruleState.cueBallInHand = false;
        ruleState.pendingDecision = null;
        ruleState.missSequence = { count: 0, originalShotId: null };
      }
      function enterRespottedBlack(state) {
        const black = (state.balls || []).find((ball) => ball.kind === BALL_KIND.BLACK);
        if (black) {
          resetBallToTable(black, colorSpot(BALL_KIND.BLACK));
        }
        const cueBall = getCueBall(state);
        const cueEvents = [];
        if (cueBall) {
          const cuePos = findCueBallDPosition(state, cueBall);
          resetBallToTable(cueBall, cuePos);
          cueEvents.push({
            type: "cue-ball-respotted",
            reason: "respotted-black",
            ballId: cueBall.id,
            pos: { ...cuePos }
          });
        }
        const ruleState = ensureRuleState(state);
        ruleState.phase = RULE_PHASE.RESPOTTED_BLACK;
        ruleState.targetColorKind = BALL_KIND.BLACK;
        ruleState.cueBallInHand = true;
        ruleState.pendingDecision = {
          type: "respotted-black-break-off",
          options: ["current-player-breaks", "other-player-breaks"]
        };
        return [{
          type: "black-respotted",
          kind: BALL_KIND.BLACK
        }, ...cueEvents];
      }
      function finishFinalBlack(state, currentPlayerId, foul, events) {
        const diff = scoreDifference(state);
        if (diff === 0) {
          events.push(...enterRespottedBlack(state));
          return;
        }
        const winnerId = diff > 0 ? state.players[0].id : state.players[1].id;
        awardFrame(state, winnerId, foul ? "final-black-foul" : "final-black-potted");
      }
      function nextClearancePhase(state) {
        const nextColor = firstActiveColorKind(state);
        if (!nextColor) {
          return { phase: RULE_PHASE.FRAME_OVER, targetColorKind: null };
        }
        if (nextColor === BALL_KIND.BLACK && hasOnlyBlackObjectBall(state)) {
          return { phase: RULE_PHASE.FINAL_BLACK, targetColorKind: BALL_KIND.BLACK };
        }
        return { phase: RULE_PHASE.CLEARANCE, targetColorKind: nextColor };
      }
      function nextPhaseAfterLegalShot(state, ruleState, score) {
        if (ruleState.phase === RULE_PHASE.REDS) {
          return score > 0 ? { phase: RULE_PHASE.COLOR_CHOICE, targetColorKind: null } : { phase: RULE_PHASE.REDS, targetColorKind: null };
        }
        if (ruleState.phase === RULE_PHASE.COLOR_CHOICE) {
          if (redCount(state) > 0) {
            return { phase: RULE_PHASE.REDS, targetColorKind: null };
          }
          return nextClearancePhase(state);
        }
        if (ruleState.phase === RULE_PHASE.CLEARANCE) {
          return score > 0 ? nextClearancePhase(state) : { phase: RULE_PHASE.CLEARANCE, targetColorKind: ruleState.targetColorKind };
        }
        return { phase: ruleState.phase, targetColorKind: ruleState.targetColorKind };
      }
      function nextPhaseAfterFoul(state, ruleState) {
        if ([RULE_PHASE.FINAL_BLACK, RULE_PHASE.RESPOTTED_BLACK].includes(ruleState.phase)) {
          return { phase: ruleState.phase, targetColorKind: BALL_KIND.BLACK };
        }
        if (redCount(state) > 0) {
          return { phase: RULE_PHASE.REDS, targetColorKind: null };
        }
        return nextClearancePhase(state);
      }
      function canCallMiss(state, shot, fouls, options = {}) {
        const settings = getRuleSettings(state);
        if (settings.missMode === MISS_MODE.OFF) return false;
        if (options.anyPlayerRequiresPenaltyPoints) return false;
        if (!fouls.some((foul) => foul.code === "no-contact" || foul.code === "wrong-first-contact")) {
          return false;
        }
        if (settings.missMode === MISS_MODE.LIMITED_THREE) {
          const count = ensureRuleState(state).missSequence?.count || 0;
          return count < settings.missLimit;
        }
        return true;
      }
      function buildFoulDecision(state, shot, ruleState, penalty, fouls, nextRule, missCalled) {
        const offenderId = shot.playerId || state.currentPlayerId;
        const nonOffenderId = otherPlayerId(state, offenderId);
        const options = [DECISION.PLAY_AGAIN];
        if (missCalled && shot.preShotSnapshot) {
          options.push(DECISION.RESTORE_PLAY_AGAIN);
        }
        return {
          type: "foul",
          offenderId,
          nonOffenderId,
          penalty,
          fouls: fouls.map((foul) => foul.code),
          foulDetails: fouls,
          miss: missCalled,
          missMode: getRuleSettings(state).missMode,
          options,
          nextRuleState: nextRule,
          restoreSnapshot: shot.preShotSnapshot || null,
          restoreShotInput: missCalled && shot.shotInput?.direction ? {
            direction: {
              x: Number(shot.shotInput.direction.x) || 0,
              y: Number(shot.shotInput.direction.y) || 0
            },
            tipOffset: {
              x: Number(shot.shotInput.tipOffset?.x) || 0,
              y: Number(shot.shotInput.tipOffset?.y) || 0
            }
          } : null,
          freeBallAvailableIfSelf: isSnookeredOnTargets(state, {
            ...nextRule,
            cueBallInHand: Boolean(shot.cueBallPotted)
          })
        };
      }
      function applyRuleStatePatch(state, patch) {
        const ruleState = ensureRuleState(state);
        ruleState.phase = patch.phase;
        ruleState.targetColorKind = patch.targetColorKind || null;
        ruleState.freeBallAvailable = Boolean(patch.freeBallAvailable);
        ruleState.freeBallKind = patch.freeBallKind || null;
        ruleState.nominatedColorKind = null;
      }
      function applyFoulResult(state, shot, ruleState, shotTarget, fouls, events, options = {}) {
        const offenderId = shot.playerId || state.currentPlayerId;
        const nonOffenderId = otherPlayerId(state, offenderId);
        const penalty = calculatePenalty(fouls, shotTarget);
        const requiredPenaltyPointsBeforeFoul = anyPlayerRequiresPenaltyPoints(state, ruleState);
        addPlayerScore(state, nonOffenderId, penalty);
        resetBreak(state, offenderId);
        if (ruleState.phase === RULE_PHASE.RESPOTTED_BLACK) {
          handleRespottedBlack(state, offenderId, true);
          return { penalty, pendingDecision: null, missCalled: false };
        }
        if (ruleState.phase === RULE_PHASE.FINAL_BLACK) {
          finishFinalBlack(state, offenderId, true, events);
          return { penalty, pendingDecision: null, missCalled: false };
        }
        if (options.respotColors !== false) {
          events.push(...respotPottedColorBalls(state, {
            includeBallIds: shot.pottedBallIds || []
          }));
        }
        if (options.respotCueBall !== false) events.push(...respotPottedCueBallInD(state));
        const nextRule = nextPhaseAfterFoul(state, ruleState);
        const missCalled = canCallMiss(state, shot, fouls, {
          anyPlayerRequiresPenaltyPoints: requiredPenaltyPointsBeforeFoul || anyPlayerRequiresPenaltyPoints(state, nextRule)
        });
        const pendingDecision = buildFoulDecision(
          state,
          shot,
          ruleState,
          penalty,
          fouls,
          nextRule,
          missCalled
        );
        const currentRuleState = ensureRuleState(state);
        state.currentPlayerId = nonOffenderId;
        clearPostShotFlags(state);
        currentRuleState.pendingDecision = pendingDecision;
        currentRuleState.phase = nextRule.phase;
        currentRuleState.targetColorKind = nextRule.targetColorKind;
        currentRuleState.freeBallAvailable = false;
        currentRuleState.freeBallKind = null;
        currentRuleState.cueBallInHand = Boolean(shot.cueBallPotted);
        if (missCalled) {
          currentRuleState.missSequence = {
            count: (currentRuleState.missSequence?.count || 0) + 1,
            originalShotId: shot.shotInput ? JSON.stringify(shot.shotInput) : null
          };
        } else {
          currentRuleState.missSequence = { count: 0, originalShotId: null };
        }
        return { penalty, pendingDecision, missCalled };
      }
      function clearPostShotFlags(state) {
        const ruleState = ensureRuleState(state);
        ruleState.freeBallAvailable = false;
        ruleState.freeBallKind = null;
        ruleState.nominatedColorKind = null;
        ruleState.requiresNomination = false;
        ruleState.nominationReason = null;
      }
      function applyLegalResult(state, shot, ruleState, shotTarget, score, events, options = {}) {
        const playerId = shot.playerId || state.currentPlayerId;
        const potted = pottedBalls(state, shot).filter((ball) => ball.kind !== BALL_KIND.CUE);
        const respotKinds = [...new Set(
          potted.map((ball) => ball.kind).filter((kind) => shouldRespotColorAfterLegalShot(ruleState, kind, shotTarget))
        )];
        if (options.respotColors !== false) {
          events.push(...respotSelectedPottedColors(state, respotKinds, "legal-shot"));
        }
        if (score > 0) {
          addPlayerScore(state, playerId, score);
          addPlayerBreak(state, playerId, score);
          let scoringPots = potted;
          if (shotTarget.freeBallKind) {
            if (ruleState.phase === RULE_PHASE.REDS) {
              scoringPots = potted.filter((ball) => ball.kind === BALL_KIND.RED || ball.kind === shotTarget.freeBallKind).map((ball) => ({ ...ball, kind: BALL_KIND.RED }));
            } else {
              scoringPots = shotTarget.targetKind ? [{ kind: shotTarget.targetKind }] : [];
            }
          }
          addCurrentBreakPots(state, scoringPots);
        }
        if (ruleState.phase === RULE_PHASE.RESPOTTED_BLACK) {
          handleRespottedBlack(state, playerId, false, score > 0);
          return;
        }
        if (ruleState.phase === RULE_PHASE.FINAL_BLACK && score > 0) {
          finishFinalBlack(state, playerId, false, events);
          return;
        }
        const next = nextPhaseAfterLegalShot(state, ruleState, score);
        applyRuleStatePatch(state, next);
        ensureRuleState(state).cueBallInHand = false;
        if (score <= 0) {
          resetBreak(state, playerId);
          state.currentPlayerId = otherPlayerId(state, playerId);
        }
        ensureRuleState(state).missSequence = { count: 0, originalShotId: null };
        clearPostShotFlags(state);
      }
      function resolveShot(state, shotRecord, options = {}) {
        const shot = normalizeShotRecord(shotRecord || state.activeShot);
        const preRuleState = cloneJson(shot.preShotRuleState || ensureRuleState(state));
        if (preRuleState.testFieldOpenTargets) {
          const first = findBallById(state, shot.firstContactBallId);
          const beforeBalls = shot.preShotSnapshot?.balls || (state.balls || []).filter((ball) => !ball.potted || shot.pottedBallIds.includes(ball.id));
          const hadReds = beforeBalls.some((ball) => ball.kind === BALL_KIND.RED && (!ball.potted || !shot.preShotSnapshot));
          preRuleState.testFieldOpenTargets = false;
          preRuleState.phase = first?.kind === BALL_KIND.RED ? RULE_PHASE.REDS : !hadReds && first?.kind === BALL_KIND.YELLOW ? RULE_PHASE.CLEARANCE : RULE_PHASE.COLOR_CHOICE;
          preRuleState.targetColorKind = preRuleState.phase === RULE_PHASE.CLEARANCE ? BALL_KIND.YELLOW : null;
        }
        const snookersRequiredBeforeShot = anyPlayerRequiresSnookers(shot.preShotSnapshot || state);
        const events = [];
        const shotTarget = inferShotTarget(state, preRuleState, shot);
        const fouls = options.detectFouls === false ? [] : detectFouls(state, preRuleState, shot, shotTarget);
        const score = fouls.length > 0 ? 0 : calculateLegalScore(state, preRuleState, shot, shotTarget);
        let penalty = 0;
        let pendingDecision = null;
        let missCalled = false;
        if (fouls.length > 0) {
          const foulResult = applyFoulResult(
            state,
            shot,
            preRuleState,
            shotTarget,
            fouls,
            events,
            options
          );
          penalty = foulResult.penalty;
          pendingDecision = foulResult.pendingDecision;
          missCalled = foulResult.missCalled;
        } else {
          applyLegalResult(state, shot, preRuleState, shotTarget, score, events, options);
        }
        const ruleState = ensureRuleState(state);
        const frameResult = state.frameOver && ruleState.lastRuleResult?.type === "frame-over" ? cloneJson(ruleState.lastRuleResult) : null;
        if (score > 0 && ruleState.testFieldOpenTargets) ruleState.testFieldOpenTargets = false;
        const result = {
          type: frameResult?.type || "shot-result",
          foul: fouls.length > 0,
          fouls: fouls.map((foul) => foul.code),
          foulDetails: fouls,
          miss: missCalled,
          points: score,
          penalty,
          shotTarget,
          pottedBallIds: shot.pottedBallIds,
          firstContactBallId: shot.firstContactBallId,
          nextPlayerId: pendingDecision ? null : state.currentPlayerId,
          nextTarget: targetKindsForRule(ruleState, state),
          pendingDecision,
          events,
          frameOver: Boolean(state.frameOver),
          winnerId: frameResult?.winnerId || null,
          reason: frameResult?.reason || null,
          overSnooker: !snookersRequiredBeforeShot && anyPlayerRequiresSnookers(state)
        };
        ruleState.lastRuleResult = result;
        prepareNextShotState(state);
        if (shotRecord) {
          shotRecord.ruleResult = result;
        }
        return { state, shotRecord, result, events };
      }
      function applyPendingDecision(state, decision) {
        const ruleState = ensureRuleState(state);
        const pending = ruleState.pendingDecision;
        if (pending?.type === "respotted-black-break-off") {
          if (!pending.options.includes(decision)) {
            return { state, applied: false, reason: "decision-not-allowed" };
          }
          if (decision === "other-player-breaks") {
            state.currentPlayerId = otherPlayerId(state, state.currentPlayerId);
          }
          ruleState.pendingDecision = null;
          ruleState.phase = RULE_PHASE.RESPOTTED_BLACK;
          ruleState.targetColorKind = BALL_KIND.BLACK;
          prepareNextShotState(state);
          return { state, applied: true };
        }
        if (!pending || pending.type !== "foul") {
          return { state, applied: false, reason: "no-pending-foul-decision" };
        }
        const implicitPlaySelf = decision === DECISION.PLAY_SELF && pending.type === "foul";
        if (!implicitPlaySelf && !pending.options.includes(decision)) {
          return { state, applied: false, reason: "decision-not-allowed" };
        }
        if (decision === DECISION.RESTORE_PLAY_AGAIN && pending.restoreSnapshot) {
          const restoredShotInput = pending.restoreShotInput?.direction ? cloneJson(pending.restoreShotInput) : null;
          const playersAfterPenalty = cloneJson(state.players || []);
          restoreBallsFromSnapshot(state, pending.restoreSnapshot);
          state.players = playersAfterPenalty;
          state.currentPlayerId = pending.offenderId;
          state.ruleState = {
            ...cloneJson(pending.restoreSnapshot.ruleState || createInitialRuleState()),
            pendingDecision: null,
            freeBallAvailable: false,
            freeBallKind: null,
            missSequence: ensureRuleState(state).missSequence
          };
          state.nextShotInput = restoredShotInput;
          prepareNextShotState(state);
          return { state, applied: true };
        }
        state.currentPlayerId = decision === DECISION.PLAY_SELF ? pending.nonOffenderId : pending.offenderId;
        state.nextShotInput = pending.fouls?.includes("shot-clock-timeout") && state.nextShotInput?.direction ? { ...cloneJson(state.nextShotInput), power: 0 } : null;
        ruleState.pendingDecision = null;
        ruleState.phase = pending.nextRuleState.phase;
        ruleState.targetColorKind = pending.nextRuleState.targetColorKind || null;
        ruleState.freeBallAvailable = decision === DECISION.PLAY_SELF ? Boolean(pending.freeBallAvailableIfSelf) : false;
        ruleState.freeBallKind = null;
        if (pending.fouls?.includes("cue-ball-potted")) {
          ruleState.cueBallInHand = true;
          state.cueBallInHandReminder = null;
        }
        prepareNextShotState(state);
        return { state, applied: true };
      }
      function setNominatedColor(state, kind) {
        const ruleState = ensureRuleState(state);
        if (!COLOR_ORDER.includes(kind)) {
          return { state, applied: false, reason: "not-a-color" };
        }
        ruleState.nominatedColorKind = kind;
        ruleState.requiresNomination = false;
        ruleState.nominationReason = null;
        return { state, applied: true };
      }
      function createRulesEngine() {
        return {
          resolveShot,
          applyPendingDecision,
          endFrame,
          prepareNextShotState,
          setNominatedColor,
          createTimeoutFoul
        };
      }
      module.exports = {
        DECISION,
        MISS_MODE,
        RULE_PHASE,
        applyPendingDecision,
        createDefaultRuleSettings,
        createInitialRuleState,
        createRulesEngine,
        createTimeoutFoul,
        detectTouchingBalls,
        displayFoulCode,
        endFrame,
        isSnookeredOnTargets,
        prepareNextShotState,
        resolveShot,
        setNominatedColor,
        targetKindsForRule,
        updateColorNomination,
        updateTouchingBalls
      };
    }
  });

  // apps/three-game/src/core/match/intermission.js
  var require_intermission = __commonJS({
    "apps/three-game/src/core/match/intermission.js"(exports, module) {
      var { BALL_KIND, COLOR_ORDER } = require_constants();
      var {
        DECISION,
        RULE_PHASE,
        displayFoulCode
      } = require_rulesEngine();
      var { ballValue } = require_scoring();
      function ballKindLabel(kind) {
        const labels = {
          [BALL_KIND.RED]: "\u7EA2\u7403",
          [BALL_KIND.YELLOW]: "\u9EC4\u7403",
          [BALL_KIND.GREEN]: "\u7EFF\u7403",
          [BALL_KIND.BROWN]: "\u68D5\u7403",
          [BALL_KIND.BLUE]: "\u84DD\u7403",
          [BALL_KIND.PINK]: "\u7C89\u7403",
          [BALL_KIND.BLACK]: "\u9ED1\u7403",
          [BALL_KIND.CUE]: "\u6BCD\u7403"
        };
        return labels[kind] || kind || "\u76EE\u6807\u7403";
      }
      function decisionLabel(decision) {
        const labels = {
          [DECISION.PLAY_SELF]: "\u81EA\u5DF1\u6253",
          [DECISION.PLAY_AGAIN]: "\u73B0\u4F4D\u91CD\u6253",
          [DECISION.RESTORE_PLAY_AGAIN]: "\u590D\u4F4D\u91CD\u6253",
          "current-player-breaks": "\u5F53\u524D\u65B9\u5F00\u7403",
          "other-player-breaks": "\u5BF9\u65B9\u5F00\u7403"
        };
        return labels[decision] || decision;
      }
      function frameScoreText(players) {
        const first = Number(players?.[0]?.frames) || 0;
        const second = Number(players?.[1]?.frames) || 0;
        return `${first}:${second}`;
      }
      function remainingTablePoints(gameState) {
        const balls = gameState?.balls || [];
        const reds = balls.filter((ball) => !ball.potted && ball.kind === BALL_KIND.RED).length;
        const colors = balls.filter((ball) => !ball.potted && ball.kind !== BALL_KIND.CUE && ball.kind !== BALL_KIND.RED);
        const colorSequencePoints = colors.reduce((sum, ball) => sum + ballValue(ball.kind), 0);
        const ruleState = gameState?.ruleState || {};
        if (reds > 0) {
          const colorAfterRedPoints = ruleState.phase === RULE_PHASE.COLOR_CHOICE ? ballValue(BALL_KIND.BLACK) : 0;
          return reds * (ballValue(BALL_KIND.RED) + ballValue(BALL_KIND.BLACK)) + colorAfterRedPoints + 27;
        }
        if (ruleState.phase === RULE_PHASE.COLOR_CHOICE || ruleState.colorAfterLastRedDue) {
          return ballValue(BALL_KIND.BLACK) + colorSequencePoints;
        }
        return colorSequencePoints;
      }
      function overSnookeredPlayerId(gameState) {
        if (gameState?.frameOver || gameState?.activeShot) return null;
        const players = gameState?.players || [];
        if (players.length < 2) return null;
        const remaining = remainingTablePoints(gameState);
        const [first, second] = players;
        const firstScore = Number(first.score) || 0;
        const secondScore = Number(second.score) || 0;
        if (firstScore < secondScore && secondScore - firstScore > remaining) return first.id;
        if (secondScore < firstScore && firstScore - secondScore > remaining) return second.id;
        return null;
      }
      function canPlayerConcede(gameState, playerId) {
        return Boolean(playerId && overSnookeredPlayerId(gameState) === playerId);
      }
      function hasTouchingBall(gameState) {
        return Boolean(!gameState?.frameOver && gameState?.ruleState?.touchingBalls?.some((ball) => ball.isOn));
      }
      function foulAwardsFreeBall(gameState, result) {
        const ruleState = gameState?.ruleState || {};
        return Boolean(result?.foul && (result.pendingDecision?.freeBallAvailableIfSelf || ruleState.pendingDecision?.freeBallAvailableIfSelf || ruleState.freeBallAvailable));
      }
      function createRuleResultMessages(gameState, result) {
        const messages = [];
        if (!result) return messages;
        const ruleState = gameState?.ruleState || {};
        const touchingBall = hasTouchingBall(gameState) && !result.frameOver;
        const awardsFreeBall = foulAwardsFreeBall(gameState, result);
        if (result.foul) {
          if (awardsFreeBall) {
            messages.push((result.miss ? "Foul and a Miss, free ball" : "Foul, free ball") + (touchingBall ? ", touching ball" : ""));
          } else {
            const reasons = (result.foulDetails || []).map((foul) => displayFoulCode(foul.code)).filter(Boolean);
            const reasonText = reasons.length ? reasons.join("\u3001") : "\u72AF\u89C4";
            const heading = result.miss ? "Foul and a Miss" : touchingBall ? "Foul" : "\u72AF\u89C4";
            messages.push(`${heading}${touchingBall ? ", touching ball" : ""}\uFF1A${reasonText}\uFF0C\u7F5A ${result.penalty || 4} \u5206`);
          }
        }
        if (touchingBall && !result.foul) messages.push("Touching ball");
        if (result.overSnooker && !gameState?.frameOver) {
          messages.push("\u5DF2\u8D85\u5206");
        }
        if (gameState?.frameOver || result.frameOver) {
          messages.push(`\u672C\u5C40\u7ED3\u675F\uFF0C\u5C40\u5206 ${frameScoreText(gameState?.players)}`);
        } else if (ruleState.phase === RULE_PHASE.RESPOTTED_BLACK) {
          messages.push("\u5EF6\u5206\uFF0C\u4E89\u9ED1\u7403");
        } else if (ruleState.requiresNomination) {
          messages.push(ruleState.nominationReason === "snookered-color-choice" ? "\u8BF7\u9009\u62E9\u89E3\u7403\u76EE\u6807" : "\u8BF7\u9009\u62E9\u76EE\u6807\u5F69\u7403");
        } else if (ruleState.freeBallAvailable && !awardsFreeBall) {
          messages.push("\u81EA\u7531\u7403");
        } else if (!result.foul && ruleState.targetColorKind && ![
          RULE_PHASE.CLEARANCE,
          RULE_PHASE.FINAL_BLACK,
          RULE_PHASE.RESPOTTED_BLACK
        ].includes(ruleState.phase)) {
          messages.push(`\u76EE\u6807\u7403\uFF1A${ballKindLabel(ruleState.targetColorKind)}`);
        }
        return messages;
      }
      function createPendingDecisionActions(gameState) {
        const pending = gameState?.ruleState?.pendingDecision;
        const decisions = [...pending?.options || []].sort((left, right) => {
          if (left === DECISION.RESTORE_PLAY_AGAIN) return -1;
          if (right === DECISION.RESTORE_PLAY_AGAIN) return 1;
          return 0;
        });
        return decisions.map((decision) => ({
          id: decision,
          type: "decision",
          value: decision,
          label: decisionLabel(decision)
        }));
      }
      function createNominationActions(gameState) {
        if (!gameState?.ruleState?.requiresNomination) return [];
        const labels = {
          [BALL_KIND.YELLOW]: "\u9EC4",
          [BALL_KIND.GREEN]: "\u7EFF",
          [BALL_KIND.BROWN]: "\u68D5",
          [BALL_KIND.BLUE]: "\u84DD",
          [BALL_KIND.PINK]: "\u7C89",
          [BALL_KIND.BLACK]: "\u9ED1"
        };
        return COLOR_ORDER.filter((kind) => gameState.balls?.some((ball) => !ball.potted && ball.kind === kind)).map((kind) => ({
          id: kind,
          type: "nomination",
          value: kind,
          label: labels[kind] || kind
        }));
      }
      function createPostFrameActions(gameState) {
        if (!gameState?.frameOver) return [];
        return [{
          id: "play-again",
          type: "play-again",
          label: "\u518D\u6765\u4E00\u5C40"
        }];
      }
      module.exports = {
        ballKindLabel,
        canPlayerConcede,
        createNominationActions,
        createPendingDecisionActions,
        createPostFrameActions,
        createRuleResultMessages,
        decisionLabel,
        frameScoreText,
        foulAwardsFreeBall,
        hasTouchingBall,
        overSnookeredPlayerId,
        remainingTablePoints
      };
    }
  });

  // apps/three-game/src/game-client/ruleToastQueue.js
  var require_ruleToastQueue = __commonJS({
    "apps/three-game/src/game-client/ruleToastQueue.js"(exports, module) {
      function createRuleToastQueue(options = {}) {
        const now = typeof options.now === "function" ? options.now : Date.now;
        const slotMs = Number.isFinite(options.slotMs) ? options.slotMs : 5e3;
        const dedupeMs = Number.isFinite(options.dedupeMs) ? options.dedupeMs : 600;
        const maxQueued = Number.isFinite(options.maxQueued) ? Math.max(1, Math.floor(options.maxQueued)) : 8;
        const replaceOnPush = options.replaceOnPush === true;
        let idSeq = 0;
        let activeToast = null;
        let queue = [];
        function clear() {
          activeToast = null;
          queue = [];
        }
        function push(text, pushOptions = {}) {
          const message = String(text || "").trim();
          if (!message) return null;
          const createdAt = now();
          const replaceKey = String(pushOptions.replaceKey || "").trim();
          const lastQueued = queue[queue.length - 1];
          if (!replaceOnPush && (activeToast?.text === message || lastQueued?.text === message && createdAt - lastQueued.createdAt < dedupeMs)) {
            return null;
          }
          const toast = {
            ...pushOptions,
            id: idSeq += 1,
            text: message,
            tone: pushOptions.tone || "info",
            createdAt
          };
          if (replaceKey) {
            queue = queue.filter((queuedToast) => queuedToast.replaceKey !== replaceKey);
            if (activeToast?.replaceKey === replaceKey) {
              activeToast = {
                ...toast,
                startedAt: createdAt
              };
              return toast;
            }
          }
          if (replaceOnPush) {
            queue = [];
            if (activeToast) {
              activeToast = {
                ...toast,
                startedAt: createdAt
              };
            } else {
              queue = [toast];
            }
            return toast;
          }
          queue.push(toast);
          if (queue.length > maxQueued) queue = queue.slice(-maxQueued);
          return toast;
        }
        function pushMany(messages, pushOptions = {}) {
          return (messages || []).map((message) => push(message, pushOptions)).filter(Boolean);
        }
        function next(timestamp = now()) {
          if (activeToast && timestamp - activeToast.startedAt >= slotMs) {
            activeToast = null;
          }
          if (!activeToast && queue.length) {
            activeToast = {
              ...queue.shift(),
              startedAt: timestamp
            };
          }
          return activeToast;
        }
        function hasQueued() {
          return queue.length > 0;
        }
        function snapshot() {
          return {
            activeToast: activeToast ? { ...activeToast } : null,
            queue: queue.map((toast) => ({ ...toast }))
          };
        }
        return {
          clear,
          hasQueued,
          next,
          push,
          pushMany,
          snapshot
        };
      }
      module.exports = {
        createRuleToastQueue
      };
    }
  });

  // assets/three-trial/layout-defaults.json
  var require_layout_defaults = __commonJS({
    "assets/three-trial/layout-defaults.json"(exports, module) {
      module.exports = {
        version: 9,
        devices: {
          desktop: {
            id: "desktop",
            name: "\u684C\u9762\u7AEF",
            width: 1920,
            height: 1080,
            pages: {
              game: {
                scoreboard: {
                  x: 50,
                  y: 960,
                  width: 1680,
                  height: 100,
                  opacity: 1
                },
                playerAvatarLeft: {
                  x: 60,
                  y: 970,
                  width: 80,
                  height: 80,
                  opacity: 1
                },
                playerNameLeft: {
                  x: 150,
                  y: 960,
                  width: 270,
                  height: 59,
                  fontSize: 24,
                  color: "#f3ead6",
                  opacity: 1
                },
                playerRatingLeft: {
                  x: 520,
                  y: 970,
                  width: 70,
                  height: 30,
                  fontSize: 16,
                  color: "#ffe7a0",
                  hidden: true,
                  opacity: 1
                },
                playerAvatarRight: {
                  x: 1180,
                  y: 970,
                  width: 80,
                  height: 80,
                  opacity: 1
                },
                playerNameRight: {
                  x: 1270,
                  y: 960,
                  width: 270,
                  height: 59,
                  fontSize: 24,
                  color: "#f3ead6",
                  opacity: 1
                },
                playerRatingRight: {
                  x: 1630,
                  y: 970,
                  width: 70,
                  height: 30,
                  fontSize: 16,
                  color: "#ffe7a0",
                  hidden: true,
                  opacity: 1
                },
                breakScoreboardLeft: {
                  x: 150,
                  y: 1020,
                  width: 430,
                  height: 40,
                  opacity: 1
                },
                breakScoreboardRight: {
                  x: 1270,
                  y: 1020,
                  width: 420,
                  height: 40,
                  opacity: 1
                },
                powerPull: {
                  x: 1772,
                  y: 290,
                  width: 110,
                  height: 356,
                  opacity: 1,
                  horizontalAnchor: "right",
                  sideInset: 38
                },
                tipPad: {
                  x: 1740,
                  y: 650,
                  size: 175,
                  width: 175,
                  height: 175,
                  opacity: 1,
                  horizontalAnchor: "right",
                  sideInset: 5
                },
                toast: {
                  x: 980,
                  y: 12,
                  width: 560,
                  height: 50,
                  opacity: 1,
                  anchor: "top",
                  topInset: 12
                },
                decision: {
                  x: 100,
                  y: 880,
                  width: 1450,
                  height: 60,
                  opacity: 1
                },
                practiceBreakScoreboard: {
                  x: 50,
                  y: 996,
                  width: 500,
                  height: 68,
                  opacity: 1,
                  anchor: "bottom",
                  bottomInset: 16,
                  backgroundOpacity: 0.42,
                  fontSize: 26.4
                },
                practiceShapeSelector: {
                  x: 696,
                  y: 996,
                  width: 220,
                  height: 68,
                  opacity: 1,
                  anchor: "bottom",
                  bottomInset: 16,
                  backgroundOpacity: 0.42,
                  fontSize: 26.4
                },
                practiceFreePlacementToggle: {
                  x: 932,
                  y: 996,
                  width: 210,
                  height: 68,
                  opacity: 1,
                  anchor: "bottom",
                  bottomInset: 16,
                  backgroundOpacity: 0.42,
                  fontSize: 26.4
                },
                practiceResetButton: {
                  x: 1634,
                  y: 996,
                  width: 220,
                  height: 68,
                  opacity: 1,
                  anchor: "bottom",
                  bottomInset: 16,
                  backgroundOpacity: 0.42,
                  fontSize: 26.4
                },
                practiceViewButtons: {
                  x: 1158,
                  y: 996,
                  width: 460,
                  height: 68,
                  opacity: 1,
                  anchor: "bottom",
                  bottomInset: 16,
                  backgroundOpacity: 0.42,
                  fontSize: 26.4
                },
                practiceDifficultySelector: {
                  x: 566,
                  y: 996,
                  width: 114,
                  height: 68,
                  opacity: 1,
                  anchor: "bottom",
                  bottomInset: 16,
                  backgroundOpacity: 0.42,
                  fontSize: 26.4
                },
                effectivePowerBar: {
                  x: 640,
                  y: 911,
                  width: 640,
                  height: 57,
                  opacity: 1,
                  anchor: "bottom",
                  bottomInset: 112
                }
              },
              loading: {
                title: {
                  x: 115.19999999999999,
                  y: 378,
                  width: 1689.6,
                  height: 90,
                  fontSize: 56,
                  text: "斯诺石狮三剑克 3D \u7EC3\u7403\u623F",
                  color: "#eee5cd",
                  opacity: 1
                },
                guide: {
                  x: 153.6,
                  y: 488,
                  width: 1612.8,
                  height: 90,
                  fontSize: 30,
                  text: "\u63A8\u8350\u4F7F\u7528\u7CFB\u7EDF\u6D4F\u89C8\u5668\u6A2A\u5C4F\u4F53\u9A8C\uFF0C\u53EF\u901A\u8FC7\u6D4F\u89C8\u5668\u5206\u4EAB\u529F\u80FD\u6DFB\u52A0\u5230\u684C\u9762\u3002",
                  color: "#a7bcb0",
                  opacity: 1
                },
                startButton: {
                  x: 480,
                  y: 648,
                  width: 960,
                  height: 90,
                  fontSize: 36,
                  opacity: 1
                }
              }
            },
            ratio: "16:9",
            orientation: "landscape"
          },
          mobile: {
            id: "mobile",
            name: "\u79FB\u52A8\u7AEF",
            width: 1920,
            height: 1080,
            pages: {
              game: {
                scoreboard: {
                  x: 50,
                  y: 960,
                  width: 1680,
                  height: 100,
                  opacity: 1
                },
                playerAvatarLeft: {
                  x: 60,
                  y: 970,
                  width: 80,
                  height: 80,
                  opacity: 1
                },
                playerNameLeft: {
                  x: 150,
                  y: 960,
                  width: 270,
                  height: 59,
                  fontSize: 24,
                  color: "#f3ead6",
                  opacity: 1
                },
                playerRatingLeft: {
                  x: 520,
                  y: 970,
                  width: 70,
                  height: 30,
                  fontSize: 16,
                  color: "#ffe7a0",
                  hidden: true,
                  opacity: 1
                },
                playerAvatarRight: {
                  x: 1180,
                  y: 970,
                  width: 80,
                  height: 80,
                  opacity: 1
                },
                playerNameRight: {
                  x: 1270,
                  y: 960,
                  width: 270,
                  height: 59,
                  fontSize: 24,
                  color: "#f3ead6",
                  opacity: 1
                },
                playerRatingRight: {
                  x: 1630,
                  y: 970,
                  width: 70,
                  height: 30,
                  fontSize: 16,
                  color: "#ffe7a0",
                  hidden: true,
                  opacity: 1
                },
                breakScoreboardLeft: {
                  x: 150,
                  y: 1020,
                  width: 430,
                  height: 40,
                  opacity: 1
                },
                breakScoreboardRight: {
                  x: 1270,
                  y: 1020,
                  width: 420,
                  height: 40,
                  opacity: 1
                },
                powerPull: {
                  x: 1772,
                  y: 290,
                  width: 110,
                  height: 356,
                  opacity: 1,
                  horizontalAnchor: "right",
                  sideInset: 38
                },
                tipPad: {
                  x: 5,
                  y: 650,
                  size: 175,
                  width: 175,
                  height: 175,
                  opacity: 1,
                  horizontalAnchor: "left",
                  sideInset: 5
                },
                toast: {
                  x: 510,
                  y: 12,
                  width: 900,
                  height: 100,
                  opacity: 1,
                  anchor: "top",
                  topInset: 12
                },
                decision: {
                  x: 100,
                  y: 880,
                  width: 1450,
                  height: 60,
                  opacity: 1
                },
                practiceBreakScoreboard: {
                  x: 50,
                  y: 996,
                  width: 500,
                  height: 68,
                  opacity: 1,
                  anchor: "bottom",
                  bottomInset: 16,
                  backgroundOpacity: 0.42,
                  fontSize: 26.4
                },
                practiceShapeSelector: {
                  x: 696,
                  y: 996,
                  width: 220,
                  height: 68,
                  opacity: 1,
                  anchor: "bottom",
                  bottomInset: 16,
                  backgroundOpacity: 0.42,
                  fontSize: 26.4
                },
                practiceFreePlacementToggle: {
                  x: 932,
                  y: 996,
                  width: 210,
                  height: 68,
                  opacity: 1,
                  anchor: "bottom",
                  bottomInset: 16,
                  backgroundOpacity: 0.42,
                  fontSize: 26.4
                },
                practiceResetButton: {
                  x: 1634,
                  y: 996,
                  width: 220,
                  height: 68,
                  opacity: 1,
                  anchor: "bottom",
                  bottomInset: 16,
                  backgroundOpacity: 0.42,
                  fontSize: 26.4
                },
                practiceViewButtons: {
                  x: 1158,
                  y: 996,
                  width: 460,
                  height: 68,
                  opacity: 1,
                  anchor: "bottom",
                  bottomInset: 16,
                  backgroundOpacity: 0.42,
                  fontSize: 26.4
                },
                practiceDifficultySelector: {
                  x: 566,
                  y: 996,
                  width: 114,
                  height: 68,
                  opacity: 1,
                  anchor: "bottom",
                  bottomInset: 16,
                  backgroundOpacity: 0.42,
                  fontSize: 26.4
                },
                effectivePowerBar: {
                  x: 640,
                  y: 911,
                  width: 640,
                  height: 57,
                  opacity: 1,
                  anchor: "bottom",
                  bottomInset: 112
                }
              },
              loading: {
                title: {
                  x: 115.19999999999999,
                  y: 378,
                  width: 1689.6,
                  height: 90,
                  fontSize: 72,
                  text: "斯诺石狮三剑克 3D \u7EC3\u7403\u623F",
                  color: "#eee5cd",
                  opacity: 1
                },
                guide: {
                  x: 153.6,
                  y: 488,
                  width: 1612.8,
                  height: 130,
                  fontSize: 32,
                  text: "\u63A8\u8350\u4F7F\u7528\u7CFB\u7EDF\u6D4F\u89C8\u5668\u6A2A\u5C4F\u4F53\u9A8C\uFF0C\u53EF\u901A\u8FC7\u6D4F\u89C8\u5668\u5206\u4EAB\u529F\u80FD\u6DFB\u52A0\u5230\u684C\u9762\u3002",
                  color: "#a7bcb0",
                  opacity: 1
                },
                startButton: {
                  x: 480,
                  y: 648,
                  width: 960,
                  height: 140,
                  fontSize: 48,
                  opacity: 1
                }
              }
            },
            ratio: "16:9",
            orientation: "landscape",
            profiles: {
              portrait: {
                id: "portrait",
                name: "\u79FB\u52A8\u7AEF\u7AD6\u5C4F",
                width: 1080,
                height: 1920,
                ratio: "16:9",
                orientation: "portrait",
                pages: {
                  game: {
                    scoreboard: {
                      x: -370,
                      y: 787.6923076923076,
                      width: 1680,
                      height: 100,
                      opacity: 1
                    },
                    playerAvatarLeft: {
                      x: -360,
                      y: 795.8974358974359,
                      width: 80,
                      height: 80,
                      opacity: 1
                    },
                    playerNameLeft: {
                      x: -270,
                      y: 787.6923076923076,
                      width: 270,
                      height: 59,
                      fontSize: 24,
                      color: "#f3ead6",
                      opacity: 1
                    },
                    playerRatingLeft: {
                      x: 100,
                      y: 795.8974358974359,
                      width: 70,
                      height: 30,
                      fontSize: 16,
                      color: "#ffe7a0",
                      hidden: true,
                      opacity: 1
                    },
                    playerAvatarRight: {
                      x: 760,
                      y: 795.8974358974359,
                      width: 80,
                      height: 80,
                      opacity: 1
                    },
                    playerNameRight: {
                      x: 850,
                      y: 787.6923076923076,
                      width: 270,
                      height: 59,
                      fontSize: 24,
                      color: "#f3ead6",
                      opacity: 1
                    },
                    playerRatingRight: {
                      x: 1210,
                      y: 795.8974358974359,
                      width: 70,
                      height: 30,
                      fontSize: 16,
                      color: "#ffe7a0",
                      hidden: true,
                      opacity: 1
                    },
                    breakScoreboardLeft: {
                      x: -270,
                      y: 836.9230769230769,
                      width: 430,
                      height: 40,
                      opacity: 1
                    },
                    breakScoreboardRight: {
                      x: 850,
                      y: 836.9230769230769,
                      width: 420,
                      height: 40,
                      opacity: 1
                    },
                    powerPull: {
                      x: 942,
                      y: 1004,
                      width: 110,
                      height: 356,
                      opacity: 1,
                      horizontalAnchor: "right",
                      sideInset: 28,
                      anchor: "bottom",
                      bottomInset: 560
                    },
                    tipPad: {
                      x: 28,
                      y: 1265,
                      size: 175,
                      width: 175,
                      height: 175,
                      opacity: 1,
                      horizontalAnchor: "left",
                      sideInset: 28,
                      anchor: "bottom",
                      bottomInset: 480
                    },
                    toast: {
                      x: 90,
                      y: 24,
                      width: 900,
                      height: 100,
                      opacity: 1,
                      anchor: "top",
                      topInset: 24
                    },
                    decision: {
                      x: -320,
                      y: 722.051282051282,
                      width: 1450,
                      height: 60,
                      opacity: 1
                    },
                    practiceBreakScoreboard: {
                      x: 76,
                      y: 1668,
                      width: 480,
                      height: 112,
                      opacity: 1,
                      anchor: "bottom",
                      bottomInset: 140,
                      backgroundOpacity: 0.42,
                      fontSize: 36
                    },
                    practiceShapeSelector: {
                      x: 724,
                      y: 1668,
                      width: 280,
                      height: 112,
                      opacity: 1,
                      anchor: "bottom",
                      bottomInset: 140,
                      backgroundOpacity: 0.42,
                      fontSize: 36
                    },
                    practiceFreePlacementToggle: {
                      x: 548,
                      y: 1796,
                      width: 224,
                      height: 112,
                      opacity: 1,
                      anchor: "bottom",
                      bottomInset: 12,
                      backgroundOpacity: 0.42,
                      fontSize: 36
                    },
                    practiceResetButton: {
                      x: 784,
                      y: 1796,
                      width: 240,
                      height: 112,
                      opacity: 1,
                      anchor: "bottom",
                      bottomInset: 12,
                      backgroundOpacity: 0.42,
                      fontSize: 36
                    },
                    practiceViewButtons: {
                      x: 56,
                      y: 1796,
                      width: 480,
                      height: 112,
                      opacity: 1,
                      anchor: "bottom",
                      bottomInset: 12,
                      backgroundOpacity: 0.42,
                      fontSize: 36
                    },
                    practiceDifficultySelector: {
                      x: 568,
                      y: 1668,
                      width: 144,
                      height: 112,
                      opacity: 1,
                      anchor: "bottom",
                      bottomInset: 140,
                      backgroundOpacity: 0.42,
                      fontSize: 36
                    },
                    effectivePowerBar: {
                      x: 220,
                      y: 1581,
                      width: 640,
                      height: 57,
                      opacity: 1,
                      anchor: "bottom",
                      bottomInset: 282
                    }
                  },
                  loading: {
                    title: {
                      x: 64.8,
                      y: 672,
                      width: 950.4,
                      height: 131.28205128205127,
                      fontSize: 52.51282051282051,
                      text: "斯诺石狮三剑克 3D \u7EC3\u7403\u623F",
                      color: "#eee5cd",
                      opacity: 1
                    },
                    guide: {
                      x: 86.4,
                      y: 819.6923076923076,
                      width: 907.1999999999999,
                      height: 260,
                      fontSize: 34,
                      text: "\u63A8\u8350\u4F7F\u7528\u7CFB\u7EDF\u6D4F\u89C8\u5668\u6A2A\u5C4F\u4F53\u9A8C\uFF0C\u53EF\u901A\u8FC7\u6D4F\u89C8\u5668\u5206\u4EAB\u529F\u80FD\u6DFB\u52A0\u5230\u684C\u9762\u3002",
                      color: "#a7bcb0",
                      opacity: 1
                    },
                    startButton: {
                      x: 270,
                      y: 1152,
                      width: 540,
                      height: 114.87179487179486,
                      fontSize: 39.38461538461539,
                      opacity: 1
                    }
                  }
                }
              }
            }
          }
        }
      };
    }
  });

  // assets/three-trial/layout-profiles.js
  var require_layout_profiles = __commonJS({
    "assets/three-trial/layout-profiles.js"(exports, module) {
      (function(root, factory) {
        const api = factory();
        if (typeof module === "object" && module.exports) module.exports = api;
        else root.ThreeTrialLayoutProfiles = api;
      })(typeof globalThis !== "undefined" ? globalThis : exports, function() {
        const ratios = { "16:9": 16 / 9, "4:3": 4 / 3, "19.5:9": 19.5 / 9, "21:9": 21 / 9 };
        const orientations = ["landscape", "portrait"];
        const clone = (value) => JSON.parse(JSON.stringify(value));
        const key = (ratio, orientation) => `${ratio}-${orientation}`;
        function dimensions(ratio, orientation) {
          const long = Math.round(1080 * ratios[ratio]);
          return orientation === "portrait" ? { width: 1080, height: long } : { width: long, height: 1080 };
        }
        function loadingGuide(mobile, portrait) {
          return {
            text: "\u63A8\u8350\u4F7F\u7528\u7CFB\u7EDF\u6D4F\u89C8\u5668\u6A2A\u5C4F\u4F53\u9A8C\uFF0C\u53EF\u901A\u8FC7\u6D4F\u89C8\u5668\u5206\u4EAB\u529F\u80FD\u6DFB\u52A0\u5230\u684C\u9762\u3002",
            height: portrait ? 260 : mobile ? 130 : 90,
            fontSize: portrait ? 34 : mobile ? 32 : 30
          };
        }
        function loadingPage(width, height, mobile = false) {
          const portrait = height > width;
          return {
            title: { x: width * 0.06, y: height * 0.35, width: width * 0.88, height: portrait ? 160 : 90, fontSize: portrait ? 64 : mobile ? 72 : 56, text: "斯诺石狮三剑克 3D \u7EC3\u7403\u623F", color: "#eee5cd", opacity: 1 },
            guide: { x: width * 0.08, y: height * 0.35 + (portrait ? 180 : 110), width: width * 0.84, ...loadingGuide(mobile, portrait), color: "#a7bcb0", opacity: 1 },
            startButton: { x: width * 0.25, y: height * 0.6, width: width * 0.5, height: portrait || mobile ? 140 : 90, fontSize: portrait || mobile ? 48 : 36, opacity: 1 }
          };
        }
        function derived(base, ratio, orientation) {
          const { width, height } = dimensions(ratio, orientation), game = clone(base.pages.game);
          for (const r of Object.values(game)) {
            if (Number.isFinite(r.x)) r.x += (width - base.width) / 2;
            if (r.anchor === "bottom") r.y = height - r.height - (r.bottomInset ?? 16);
            if (r.horizontalAnchor) r.x = r.horizontalAnchor === "left" ? r.sideInset ?? 5 : width - r.width - (r.sideInset ?? 5);
          }
          const footer = ["practiceBreakScoreboard", "practiceDifficultySelector", "practiceShapeSelector", "practiceFreePlacementToggle", "practiceViewButtons", "practiceResetButton"];
          for (const k of footer) if (game[k]) {
            game[k].x = base.pages.game[k].x * width / base.width;
            game[k].width *= width / base.width;
          }
          if (orientation === "portrait") {
            const put = (k, x, bottom, w, h) => {
              game[k] = { ...game[k], x, y: height - bottom - h, width: w, height: h, anchor: "bottom", bottomInset: bottom, fontSize: 36 };
            };
            put("practiceBreakScoreboard", 76, 140, 480, 112);
            put("practiceDifficultySelector", 568, 140, 144, 112);
            put("practiceShapeSelector", 724, 140, 280, 112);
            put("practiceViewButtons", 56, 12, 480, 112);
            put("practiceFreePlacementToggle", 548, 12, 224, 112);
            put("practiceResetButton", 784, 12, 240, 112);
            game.tipPad = { ...game.tipPad, x: 28, y: height - 740, width: 260, height: 260, size: 260, sideInset: 28, anchor: "bottom", bottomInset: 480 };
            game.powerPull = { ...game.powerPull, x: 942, y: height - 960, width: 110, height: 400, sideInset: 28, anchor: "bottom", bottomInset: 560 };
            game.toast = { ...game.toast, x: 90, y: 24, width: 900, height: 100, topInset: 24 };
          }
          return { id: key(ratio, orientation), name: `${ratio} ${orientation === "portrait" ? "\u7AD6\u5C4F" : "\u6A2A\u5C4F"}`, width, height, ratio, orientation, pages: { game, loading: loadingPage(width, height, base.id === "mobile") } };
        }
        const footerKeys = ["practiceBreakScoreboard", "practiceDifficultySelector", "practiceShapeSelector", "practiceFreePlacementToggle", "practiceViewButtons", "practiceResetButton"];
        const layouts = { desktop: { name: "\u684C\u9762\u7AEF\u6A2A\u5C4F", device: "desktop", orientation: "landscape" }, mobile: { name: "\u79FB\u52A8\u7AEF\u6A2A\u5C4F", device: "mobile", orientation: "landscape" }, mobilePortrait: { name: "\u79FB\u52A8\u7AEF\u7AD6\u5C4F", device: "mobile", orientation: "portrait" } };
        function normalize(input) {
          const config = clone(input);
          for (const id of ["desktop", "mobile"]) {
            const base = config.devices?.[id];
            if (!base?.pages?.game) throw Error("\u5FC5\u987B\u5305\u542B\u684C\u9762\u7AEF\u548C\u79FB\u52A8\u7AEF\u7684\u7EC3\u7403\u5E03\u5C40");
            base.pages.loading ??= loadingPage(base.width, base.height, id === "mobile");
            base.ratio = "16:9";
            base.orientation = "landscape";
            if (id === "mobile") {
              let portrait = base.profiles?.portrait || base.profiles?.["19.5:9-portrait"] || derived(base, "16:9", "portrait");
              if (portrait.width !== 1080 || portrait.height !== 1920) portrait = fit(portrait, 1080, 1920, { width: 1080, height: 1920 });
              portrait.ratio = "16:9";
              portrait.id = "portrait";
              portrait.orientation = "portrait";
              portrait.name = "\u79FB\u52A8\u7AEF\u7AD6\u5C4F";
              base.profiles = { portrait };
            } else delete base.profiles;
          }
          if ((input.version || 1) < 6) {
            const portrait = config.devices.mobile.profiles.portrait;
            const initial = derived(config.devices.mobile, "16:9", "portrait");
            for (const key2 of footerKeys) portrait.pages.game[key2] = { ...portrait.pages.game[key2], ...Object.fromEntries(["x", "y", "width", "height", "anchor", "bottomInset", "fontSize"].map((field) => [field, initial.pages.game[key2][field]])) };
          }
          if ((input.version || 1) < 7) {
            for (const id of Object.keys(layouts)) {
              const profile = get(config, id);
              for (const key2 of footerKeys) if (profile.pages.game[key2]) profile.pages.game[key2].fontSize = id === "mobilePortrait" ? 36 : 26.4;
            }
          }
          for (const id of Object.keys(layouts)) {
            const profile = get(config, id);
            profile.pages.game.effectivePowerBar ??= { x: (profile.width - 640) / 2, y: profile.height - (id === "mobilePortrait" ? 320 : 150), width: 640, height: (input.version || 1) < 9 ? 38 : 57, opacity: 1, anchor: "bottom", bottomInset: id === "mobilePortrait" ? 282 : 112 };
          }
          if ((input.version || 1) < 8) {
            const landscape = config.devices.mobile, portrait = landscape.profiles.portrait;
            const from = portrait.pages.game.toast, to = landscape.pages.game.toast;
            if (from && to) {
              to.width = from.width;
              to.height = from.height;
              to.x = (landscape.width - to.width) / 2;
            }
          }
          for (const id of Object.keys(layouts)) {
            const profile = get(config, id), bar = profile.pages.game.effectivePowerBar;
            if ((input.version || 1) < 9) bar.height *= 1.5;
            bar.x = (profile.width - bar.width) / 2;
            if (bar.anchor === "bottom") bar.y = profile.height - bar.height - bar.bottomInset;
          }
          for (const id of Object.keys(layouts)) {
            const guide = get(config, id).pages.loading.guide;
            if (guide?.text === "\u6DFB\u52A0\u81F3\u4E3B\u5C4F\u5E55\uFF0C\u53EF\u83B7\u5F97\u66F4\u5B8C\u6574\u7684\u6E38\u620F\u4F53\u9A8C\u3002") Object.assign(guide, loadingGuide(id !== "desktop", id === "mobilePortrait"));
          }
          syncMobileControlSizes(config, "mobile");
          config.version = 9;
          return config;
        }
        function syncMobileControlSizes(config, sourceId) {
          if (!["mobile", "mobilePortrait"].includes(sourceId)) return;
          const source = get(config, sourceId), target = get(config, sourceId === "mobile" ? "mobilePortrait" : "mobile");
          for (const key2 of ["tipPad", "powerPull", "toast"]) {
            const from = source.pages.game[key2], to = target.pages.game[key2];
            if (!from || !to) continue;
            const resized = from.width !== to.width || from.height !== to.height;
            for (const field of ["width", "height", "size"]) {
              if (from[field] !== void 0) to[field] = from[field];
              else delete to[field];
            }
            if (resized && to.anchor === "bottom") to.y = target.height - to.height - (to.bottomInset ?? 16);
            if (resized && to.horizontalAnchor === "right") to.x = target.width - to.width - (to.sideInset ?? 5);
          }
        }
        function get(config, layoutId) {
          return layoutId === "mobilePortrait" ? config.devices.mobile.profiles.portrait : config.devices[layoutId];
        }
        function select(config, device, width, height) {
          return get(config, device === "mobile" && height > width ? "mobilePortrait" : device);
        }
        function fit(profile, width, height, screenSize) {
          const scale = screenSize?.width > 0 && screenSize?.height > 0 ? Math.min(Math.min(screenSize.width, screenSize.height) / 1080, Math.max(screenSize.width, screenSize.height) / 1920) : Math.min(width / profile.width, height / profile.height), w = width / scale, h = height / scale;
          if (Math.abs(w - profile.width) < 0.01 && Math.abs(h - profile.height) < 0.01) return profile;
          const fx = w / profile.width, fy = h / profile.height, pages = {};
          const footer = /* @__PURE__ */ new Set(["practiceBreakScoreboard", "practiceDifficultySelector", "practiceShapeSelector", "practiceFreePlacementToggle", "practiceViewButtons", "practiceResetButton"]);
          for (const [page, elements] of Object.entries(profile.pages)) {
            pages[page] = {};
            for (const [key2, r] of Object.entries(elements)) {
              const next = { ...r };
              if (page === "loading") {
                next.x = r.x * fx;
                next.y = r.y * fy;
                next.width = r.width * fx;
                next.height = r.height * fy;
                next.fontSize = r.fontSize * Math.min(fx, fy);
              } else {
                if (Number.isFinite(r.x)) next.x = r.x * fx;
                if (Number.isFinite(r.y)) next.y = r.y * fy;
                if (footer.has(key2) && profile.orientation === "portrait") {
                  next.x = r.x + (w - profile.width) / 2;
                } else if (footer.has(key2)) next.width = r.width * fx;
                if (key2 === "effectivePowerBar") next.x = (w - r.width) / 2;
                if (key2 === "toast") next.x = (w - r.width) / 2 + (r.x - (profile.width - r.width) / 2);
                if (footer.has(key2)) next.fontSize = (r.fontSize || 26.4) * Math.min(1, fx);
                if (r.anchor === "bottom") next.y = h - r.height - (r.bottomInset ?? 16);
                if (r.anchor === "top") next.y = r.topInset ?? 12;
                if (r.horizontalAnchor) next.x = r.horizontalAnchor === "left" ? r.sideInset ?? 5 : w - r.width - (r.sideInset ?? 5);
              }
              pages[page][key2] = next;
            }
          }
          return { ...profile, width: w, height: h, pages };
        }
        return { ratios, orientations, key, dimensions, layouts, normalize, get, select, fit, syncMobileControlSizes };
      });
    }
  });

  // apps/three-game/trial/layout-runtime.cjs
  var require_layout_runtime = __commonJS({
    "apps/three-game/trial/layout-runtime.cjs"(exports, module) {
      var defaults = require_layout_defaults();
      var Profiles = require_layout_profiles();
      var preferences = require_device_preferences();
      var { deviceType } = preferences;
      async function createLayoutRuntime() {
        if (window.ThreeTrialPageLayout) return window.ThreeTrialPageLayout;
        const params = new URLSearchParams(location.search);
        const preview = window.parent !== window && params.has("layoutEditorPreview");
        const override = params.get("layoutEditorDevice");
        const device = preview && ["desktop", "mobile"].includes(override) ? override : deviceType(navigator);
        const settings = window.SnookerPracticeSettings ||= preferences;
        let operationLayout = settings.read().operationLayout;
        const effectiveDevice = () => preview ? device : operationLayout || device;
        const onLayoutChange = (event) => {
          operationLayout = event.detail;
        };
        if (!preview) window.addEventListener("operation-layout-change", onLayoutChange);
        let config = Profiles.normalize(defaults);
        const apply = (next) => {
          if (next?.devices?.[device]?.pages?.game) config = Profiles.normalize(next);
        };
        try {
          const response = await fetch(new URL("../layout-overrides.json", document.baseURI), { cache: "no-store" });
          if (response.ok) apply(await response.json());
        } catch (error) {
          console.error("3D \u5E03\u5C40\u8F7D\u5165\u5931\u8D25", error);
        }
        const onMessage = (event) => {
          if (event.origin === location.origin && event.source === window.parent && event.data?.type === "layout-editor-preview-layout") apply(event.data.layout);
        };
        if (preview) window.addEventListener("message", onMessage);
        window.addEventListener("pagehide", (event) => {
          if (event.persisted) return;
          window.removeEventListener("message", onMessage);
          window.removeEventListener("operation-layout-change", onLayoutChange);
        });
        let cachedSource, cachedWidth, cachedHeight, cachedScreenEdge, cachedProfile;
        const profile = () => {
          const source = preview ? Profiles.get(config, params.get("layoutEditorLayout") || device) : Profiles.select(config, effectiveDevice(), innerWidth, innerHeight);
          const screenSize = !preview && effectiveDevice() === "mobile" ? device === "mobile" ? { width: window.screen?.width || innerWidth, height: window.screen?.height || innerHeight } : { width: innerWidth, height: innerHeight } : void 0;
          const screenEdge = screenSize ? `${screenSize.width}:${screenSize.height}` : "";
          if (screenEdge !== cachedScreenEdge || source !== cachedSource || cachedWidth !== innerWidth || cachedHeight !== innerHeight) {
            cachedScreenEdge = screenEdge;
            cachedSource = source;
            cachedWidth = innerWidth;
            cachedHeight = innerHeight;
            cachedProfile = Profiles.fit(source, innerWidth, innerHeight, screenSize);
          }
          return cachedProfile;
        };
        const sourceProfile = () => preview ? Profiles.get(config, params.get("layoutEditorLayout") || device) : Profiles.select(config, effectiveDevice(), innerWidth, innerHeight);
        return { physicalDevice: device, get device() {
          return effectiveDevice();
        }, preview, profile, sourceProfile, page: (name = "game") => profile().pages[name], ready() {
          if (preview) window.parent.postMessage({ type: "three-trial-layout-ready" }, location.origin);
        } };
      }
      module.exports = { createLayoutRuntime, deviceType };
    }
  });

  // apps/three-game/trial/footer-layout.cjs
  var require_footer_layout = __commonJS({
    "apps/three-game/trial/footer-layout.cjs"(exports, module) {
      var keys = ["practiceBreakScoreboard", "practiceDifficultySelector", "practiceShapeSelector", "practiceFreePlacementToggle", "practiceViewButtons", "practiceResetButton"];
      function fitFooter(layout, { width, height, left = 0, right = 0, preview = false }) {
        const s = Math.min(width / 1920, height / 1080), ox = (width - 1920 * s) / 2;
        const items = keys.map((k) => layout[k]).filter((r) => r && !r.hidden);
        if (preview || !items.length) return { scale: 1, x: 0, y: 0 };
        const minX = Math.min(...items.map((r) => r.x)), maxX = Math.max(...items.map((r) => r.x + r.width));
        const bottom = Math.max(...items.map((r) => r.y + r.height));
        const margin = 12;
        const scale = Math.max(1, width - left - right - margin * 2) / (Math.max(1, maxX - minX) * s);
        return { scale, x: (left + margin - ox) / s - minX * scale, y: bottom * (1 - scale) };
      }
      function mapFooterRect(r, t) {
        return { ...r, x: r.x * t.scale + t.x, y: r.y * t.scale + t.y, width: r.width * t.scale, height: r.height * t.scale };
      }
      function anchorFooterBottom(layout, { height, scale, offsetY = 0, safeBottom = 0, margin = 12 }) {
        const items = keys.map((key) => layout[key]).filter((r) => r && !r.hidden);
        if (!items.length) return layout;
        const bottom = Math.max(...items.map((r) => r.y + r.height));
        const shift = (height - safeBottom - margin - offsetY) / scale - bottom;
        return Object.fromEntries(Object.entries(layout).map(([key, r]) => [key, keys.includes(key) ? { ...r, y: r.y + shift } : r]));
      }
      function distributeFooterRows(layout, { width, scale, offsetX = 0, safeLeft = 0, safeRight = 0, margin = 12, gap = 12 }) {
        const result = { ...layout }, rows = /* @__PURE__ */ new Map();
        for (const key of keys) {
          const r = layout[key];
          if (!r || r.hidden) continue;
          const row = rows.get(r.y) || [];
          row.push(key);
          rows.set(r.y, row);
        }
        for (const row of rows.values()) {
          row.sort((a, b) => layout[a].x - layout[b].x);
          const available = (width - safeLeft - safeRight - 2 * margin) / scale - gap * (row.length - 1);
          const total = row.reduce((sum, key) => sum + layout[key].width, 0);
          let x = (safeLeft + margin - offsetX) / scale;
          for (const key of row) {
            const r = layout[key], w = available * r.width / total;
            result[key] = { ...r, x, width: w };
            x += w + gap;
          }
        }
        return result;
      }
      module.exports = { fitFooter, mapFooterRect, anchorFooterBottom, distributeFooterRows, keys };
    }
  });

  // apps/three-game/product/design-style.cjs
  var require_design_style = __commonJS({
    "apps/three-game/product/design-style.cjs"(exports, module) {
      module.exports = `/* High-fidelity baseline copied 2026-10-10. */
*{box-sizing:border-box}body{margin:0;background:#dedede;color:#262626;font:14px/1.5 system-ui,-apple-system,"PingFang SC",sans-serif}button,input,select,textarea{font:inherit;color:inherit}button{cursor:pointer;border:1px solid #aaa;background:#fff;padding:9px 14px;border-radius:4px;min-height:40px}button:hover{background:#eee}button:disabled{opacity:.45;cursor:not-allowed}button:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible{outline:3px solid #555;outline-offset:3px}.primary,button.active{background:#333;color:#fff;border-color:#333}.quiet{background:transparent;border-color:transparent}.danger{border-style:dashed;border-color:#777}input,select,textarea{background:#fff;border:1px solid #aaa;padding:10px;width:100%;border-radius:3px}textarea{resize:vertical}label{display:grid;gap:6px}small,.muted{color:#666;font-size:12px}h1,h2,h3,p{margin:0}h1{font-size:24px}h2{font-size:20px}h3{font-size:17px}a{color:inherit}button small{display:block}.hidden,[hidden]{display:none!important}
#navigator{position:fixed;left:0;top:0;bottom:0;width:248px;background:#fafafa;border-right:1px solid #bbb;display:flex;flex-direction:column;z-index:20}#navigator header{padding:18px 16px 12px}#navigator header small{display:block;margin-top:4px}#search{width:calc(100% - 24px);margin:0 12px 10px;font-size:12px}#tree{overflow:auto;flex:1;padding:0 8px 12px}#tree details{margin-bottom:8px}#tree summary{padding:8px;font-size:13px;font-weight:600;cursor:pointer}#tree button{display:flex;gap:8px;width:100%;text-align:left;font-size:12px;min-height:32px;border:0;background:transparent;padding:6px 8px 6px 17px}#tree button.active{background:#ddd;color:#111}#tree .type{color:#777;font-size:10px;margin-left:auto;white-space:nowrap}#navigator footer{display:flex;padding:10px;gap:6px;border-top:1px solid #ccc}#navigator footer button{font-size:12px;min-height:32px;padding:6px 10px}#workspace{margin-left:248px}#toolbar{height:64px;position:sticky;top:0;z-index:15;background:#f9f9f9;display:flex;align-items:center;padding:10px 16px;gap:8px;border-bottom:1px solid #bbb}#toolbar button{font-size:12px;min-height:34px;padding:6px 12px}#canvasInfo{flex:1;color:#666;font-size:12px}.orientation{display:flex;gap:4px}#canvasWrap{padding:18px 20px;overflow:auto}#stage{position:relative;margin:auto;background:#fafafa;border:1px solid #999;overflow:hidden}#screen{position:absolute;left:0;top:0;transform-origin:top left;background:#f5f5f5;width:960px;height:540px;overflow:hidden}#game{height:100%;display:flex;flex-direction:column}#inspector{padding:12px 20px 24px;font-size:12px;display:grid;gap:7px;color:#555}#stateActions{display:flex;flex-wrap:wrap;gap:6px}#stateActions button{font-size:12px;min-height:30px;padding:5px 9px}.topbar{height:64px;flex-shrink:0;background:#fff;border-bottom:1px solid #bbb;display:flex;align-items:center;padding:8px 18px;gap:8px}.topbar button{border-color:transparent;background:transparent;padding:8px 10px;white-space:nowrap}.topbar .identity{margin-right:auto;max-width:180px;text-overflow:ellipsis;overflow:hidden}.topbar .network{font-size:12px;white-space:nowrap;color:#666}.avatar{display:inline-flex;align-items:center;justify-content:center;border:1px solid #999;border-radius:50%;width:30px;height:30px;margin-right:7px;font-size:12px;background:#eee}.home{flex:1;position:relative;background:#e5e5e5}.background-placeholder{position:absolute;inset:0;display:grid;place-items:center;color:#999;font-size:22px;pointer-events:none}.roster{position:absolute;top:36px;left:22px;width:114px;background:#fffffff0;border:1px solid #aaa}.roster button{width:100%;border:0;border-bottom:1px solid #ccc;border-radius:0;padding:12px 5px;background:transparent}.roster .roster-title{font-size:13px;padding:9px 3px;background:#eee}.roster small{display:block}.mode-nav{position:absolute;left:180px;right:52px;bottom:52px;display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.mode-nav button{height:78px;font-size:24px;font-weight:650;border-radius:0;border:1px solid #888}.mode-nav button:last-child{background:#d3d3d3;border:2px solid #666}.resume{position:absolute;top:18px;right:26px;padding:10px 14px;background:#fff;border:1px dashed #777;display:flex;align-items:center;gap:18px}.page{flex:1;min-height:0;display:flex;flex-direction:column;padding:18px 28px}.page-header{display:flex;align-items:center;gap:14px;margin-bottom:18px;flex-shrink:0}.page-header h1{flex:1}.page-header button{min-width:60px}.page-content{overflow:auto;min-height:0;flex:1;padding:2px 4px 10px}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.grid.two{grid-template-columns:repeat(2,minmax(0,1fr))}.grid.four{grid-template-columns:repeat(4,minmax(0,1fr))}.card{border:1px solid #aaa;padding:18px;background:#fff;display:flex;flex-direction:column;gap:10px;min-width:0}.card button{margin-top:auto}.card .big{font-size:26px;font-weight:650}.card .caption{font-size:13px;color:#666}.section-title{font-size:16px;margin:18px 0 10px}.tabs{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:16px}.tabs button{font-size:14px}.row{display:flex;justify-content:space-between;align-items:center;gap:16px;padding:12px 0;border-bottom:1px solid #d1d1d1}.row:last-child{border-bottom:0}.row small{display:block}.row strong{font-size:16px}.actions{display:flex;gap:10px;margin-top:18px}.actions button{flex:1}.form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.form .full{grid-column:1/-1}.form-wrap{max-width:650px;margin:auto}.summary{background:#eaeaea;padding:14px 18px;border:1px solid #bbb;margin-bottom:16px}.empty{height:100%;min-height:180px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;text-align:center}.empty p{color:#666}.spinner{width:32px;height:32px;border:3px solid #ccc;border-top-color:#333;border-radius:50%;animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}.tag{border:1px solid #aaa;padding:3px 8px;font-size:12px;background:#eee;white-space:nowrap}.table{width:100%;border-collapse:collapse;font-size:14px}.table td,.table th{padding:11px 10px;border-bottom:1px solid #ccc;text-align:left;white-space:nowrap}.table th{background:#eee;font-weight:500}.table .me{background:#e5e5e5}.filters{display:flex;gap:8px;margin-bottom:12px}.filters select{width:auto}.stat-row{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:18px}.stat-row>div{border:1px solid #bbb;background:#fff;text-align:center;padding:12px}.stat-row b{display:block;font-size:22px}.stat-row small{display:block}.linkbtn{border:0;background:transparent;text-decoration:underline;padding:3px;min-height:32px}.pagination{display:flex;align-items:center;justify-content:center;gap:12px;margin-top:14px}.switch{width:auto}.inline{display:flex;align-items:center;gap:8px}.flex1{flex:1;min-width:0}.error-text{color:#333;border-left:3px solid #777;background:#eee;padding:8px 12px;margin-top:10px;font-size:13px}.rules{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:14px 0}.rules span{background:#eee;padding:8px 12px}.room-players{display:grid;grid-template-columns:1fr 40px 1fr;align-items:center;gap:16px;margin:18px 0}.seat{border:1px solid #aaa;background:white;padding:25px;text-align:center;font-size:20px}.seat small{display:block;margin-top:8px}.seat.empty-seat{border-style:dashed;color:#777}.match-countdown{font-size:54px;font-weight:650}.match-hud{display:flex;align-items:center;gap:14px;justify-content:space-between;padding:12px 20px;border-bottom:1px solid #bbb;background:white}.score{display:flex;gap:16px;align-items:center;font-size:20px}.score b{font-size:28px}.clock{border:1px solid #888;padding:5px 12px;font-weight:650}.table-area{position:relative;flex:1;min-height:0;margin:16px 22px;border:2px solid #999;background:#dedede;display:flex;align-items:center;justify-content:center}.table-label{color:#888;font-size:22px}.table-state{position:absolute;top:14px;left:50%;transform:translateX(-50%);background:#fafafa;border:1px solid #aaa;padding:8px 14px;white-space:nowrap}.table-footer{display:flex;align-items:center;gap:10px;padding:0 22px 16px;flex-shrink:0}.table-footer .spacer{flex:1}.table-controls{position:absolute;right:14px;bottom:14px;display:flex;gap:8px}.table-controls button{background:#f5f5f5}.practice-title{display:flex;gap:12px;padding:12px 20px;align-items:center}.practice-title h2{flex:1}.chat-panel{position:absolute;right:0;top:64px;bottom:0;width:285px;border-left:1px solid #999;background:#fff;z-index:4;display:flex;flex-direction:column;padding:16px;gap:12px}.chat-history{flex:1;overflow:auto;font-size:13px}.chat-history p{padding:8px;background:#eee;margin-bottom:8px}.replay-controls{display:flex;align-items:center;gap:8px;padding:0 22px 18px}.replay-controls input{flex:1}.timeline-label{min-width:80px;font-size:12px}.mail-preview{padding:28px;border:1px solid #bbb;background:white;max-width:680px;margin:0 auto}.mail-preview .code{font-size:32px;letter-spacing:8px;font-weight:bold;margin:22px 0}.mail-preview p{margin:12px 0}.reward-total{font-size:32px;font-weight:650}.result-title{font-size:28px;margin-bottom:10px}.result-summary{display:grid;grid-template-columns:1fr 1fr;gap:18px}.result-panel{border:1px solid #aaa;background:#fff;padding:18px}.result-panel .row{padding:8px 0}.notice-bar{padding:9px 12px;background:#e6e6e6;border-left:3px solid #888;margin:12px 0}.small-text{font-size:13px}.device-card{border:1px solid #bbb;background:white;padding:14px;margin-bottom:12px}.check-label{display:flex;align-items:center;gap:8px}.check-label input{width:auto}.double{display:grid;grid-template-columns:1fr 1fr;gap:18px}#overlay{position:absolute;inset:0;background:#0006;z-index:10;display:flex;align-items:center;justify-content:center;padding:20px}.dialog{background:#fff;border:1px solid #666;width:460px;max-width:100%;max-height:100%;display:flex;flex-direction:column;box-shadow:0 10px 24px #0002}.dialog.wide{width:650px}.dialog-head{display:flex;align-items:center;gap:12px;padding:14px 18px;border-bottom:0}.dialog-head h2{flex:1}.dialog-head button{border:0;font-size:20px;padding:3px 8px;min-height:32px}.dialog-body{padding:18px;overflow:auto}.dialog-body>p{margin-bottom:12px}.dialog-body label+label{margin-top:14px}.dialog-body input[type=range]{padding:0}.dialog-body .row{padding:10px 0}.dialog .error-text:empty{display:none}#toast{position:absolute;z-index:12;bottom:26px;left:50%;transform:translateX(-50%);padding:10px 18px;background:#333;color:white;max-width:85%;text-align:center;font-size:14px}.dialog-body .form{gap:10px}.chat-compose{display:flex;gap:6px}.chat-compose input{min-width:0}.chat-compose button{padding:8px}.wire{border:1px dashed #aaa;background:#e7e7e7;min-height:90px;display:flex;align-items:center;justify-content:center;color:#777}.email-note{font-size:12px;color:#777}.portrait .topbar{padding:8px 10px;gap:2px}.portrait .topbar button{font-size:12px;padding:7px}.portrait .topbar .avatar{display:none}.portrait .topbar .identity{max-width:82px}.portrait .wide-only{display:none}.portrait .network{font-size:10px}.portrait .roster{left:16px;top:42px;width:92px}.portrait .mode-nav{left:18px;right:18px;bottom:116px;gap:10px}.portrait .mode-nav button{font-size:22px;height:78px;padding:8px}.portrait .page{padding:18px}.portrait .page-header{gap:10px}.portrait .page-header h1{font-size:22px}.portrait .grid,.portrait .grid.four{grid-template-columns:1fr 1fr}.portrait .grid.two{grid-template-columns:1fr}.portrait .form{grid-template-columns:1fr}.portrait .form .full{grid-column:auto}.portrait .stat-row{grid-template-columns:1fr 1fr}.portrait .result-summary,.portrait .double{grid-template-columns:1fr}.portrait .table th,.portrait .table td{padding:10px 6px;font-size:13px}.portrait .filters{flex-wrap:wrap}.portrait .room-players{gap:8px;grid-template-columns:1fr 24px 1fr}.portrait .seat{padding:22px 6px}.portrait .score{font-size:15px;gap:9px}.portrait .score b{font-size:24px}.portrait .match-hud{gap:8px;padding:10px 12px;flex-wrap:wrap}.portrait .match-hud>.tag{display:none}.portrait .table-area{margin:14px}.portrait .table-footer{padding:0 14px 16px;gap:5px;flex-wrap:wrap}.portrait .table-footer button{padding:8px 10px;font-size:13px}.portrait .table-controls{flex-wrap:wrap;max-width:80%}.portrait .practice-title{flex-wrap:wrap;padding:12px 14px}.portrait .practice-title h2{flex-basis:60%;font-size:18px}.portrait .resume{top:auto;bottom:220px;left:18px;right:18px}.portrait .dialog{width:440px}.portrait .dialog.wide{width:100%}.portrait .chat-panel{width:100%}.portrait .rules{font-size:13px}.portrait .replay-controls{flex-wrap:wrap}.portrait .replay-controls input{flex-basis:50%}.portrait .page-header .tag{display:none}@media(max-width:800px){#navigator{width:196px}#workspace{margin-left:196px}#toolbar{height:auto;min-height:64px;flex-wrap:wrap;padding:8px}#canvasWrap{padding:10px}#canvasInfo{min-width:160px}#navigator header{padding:12px}#navigator footer{flex-wrap:wrap}}@media(prefers-reduced-motion:reduce){.spinner{animation:none}}

/* Audit fixes: persistent result actions and compact rows; side drawers stay inside the canvas. */
.page-footer{flex-shrink:0;border-top:1px solid #bbb;padding-top:12px;margin-top:8px}.result-panel{padding:14px}.result-panel .row{padding:6px 0}.dialog.chat-panel{top:0;bottom:0;max-height:none;width:300px;max-width:100%;margin:0}.dialog.chat-panel .dialog-body{flex:1;overflow:auto}.portrait .dialog.chat-panel{width:100%}.dialog-head button[hidden]{display:none}.dialog:focus{outline:none}

.power-control{font-size:12px;background:#f5f5f5;border:1px solid #aaa;padding:4px 10px;width:100px}.power-control input{padding:0;height:16px}.table-controls{align-items:end}.portrait .table-controls{max-width:94%;gap:5px}.portrait .table-controls button{font-size:12px;padding:8px}.portrait .power-control{width:80px}

.table-controls button.primary{background:#333;color:#fff;border-color:#333}input[type=range],input[type=checkbox]{accent-color:#555}#overlay[data-drawer=online] .chat-panel,#overlay[data-drawer=online-empty] .chat-panel{left:auto;right:0;border-left:1px solid #999;border-right:0}

/* Homepage wireframe: utility header, central modes, daily activities, right roster. */
.home .background-placeholder{inset:28px 160px auto 32px;height:100px;font-size:18px;color:#aaa}
.home .roster{left:auto;right:18px;top:64px;width:120px}
.home .roster button{display:flex;align-items:center;justify-content:center;gap:8px;padding:10px 5px;text-align:left;font-size:13px}
.home .roster .roster-title{font-size:13px;padding:12px 5px;gap:5px}
.roster-arrow{margin-left:3px}.roster-avatar{width:27px;height:27px;display:grid;place-items:center;border:1px solid #aaa;background:#eee}
.home .roster .roster-expand{font-size:12px;color:#555;border-bottom:0}
.home .mode-nav{left:32px;right:164px;top:150px;bottom:auto;gap:16px}
.home .mode-nav button{height:150px;font-size:27px;background:#fafafa;border:1px solid #888;box-shadow:0 3px 0 #ccc}
.home .mode-nav button:last-child{background:#d5d5d5;border:2px solid #666}
.home-activities{position:absolute;left:32px;right:164px;bottom:28px;display:grid;grid-template-columns:1fr 1fr;gap:16px}
.home-activities .activity{height:88px;display:flex;align-items:center;justify-content:space-between;text-align:left;padding:14px 18px;background:#f7f7f7;gap:10px}
.activity strong{display:block;font-size:18px}.activity small{display:block;margin-top:7px;font-size:12px;color:#666}.activity-status{border:1px solid #aaa;padding:6px 10px;font-size:13px;white-space:nowrap;background:#eee}
.home .resume{top:18px;left:32px;right:164px;z-index:1;justify-content:space-between}
.portrait .home .background-placeholder{inset:30px 110px auto 22px;height:100px}
.portrait .home .roster{left:auto;right:12px;top:158px;width:92px}
.portrait .home .roster button{font-size:12px;gap:5px}.portrait .roster-avatar{display:none}
.portrait .home .roster .roster-title{flex-wrap:wrap;font-size:12px}
.portrait .home .mode-nav{left:22px;right:124px;top:158px;bottom:auto;grid-template-columns:1fr;gap:18px}
.portrait .home .mode-nav button{height:132px;font-size:28px}
.portrait .home-activities{left:22px;right:22px;bottom:36px;grid-template-columns:1fr;gap:12px}
.portrait .home-activities .activity{height:90px;padding:16px 20px}.portrait .activity strong{font-size:20px}.portrait .activity small{font-size:14px}
.portrait .home .resume{left:22px;right:22px;top:18px;bottom:auto}

/* Compact homepage navigation and daily challenges. */
.topbar{justify-content:space-between;gap:6px}.topbar>button{flex:1;min-width:0;padding:8px 5px}.topbar .identity{margin-right:0;max-width:none;flex:1.3;white-space:nowrap}.portrait .topbar .identity{max-width:none}.portrait .topbar>button{padding:7px 3px}
.home .roster,.portrait .home .roster{left:auto;right:18px;top:130px;width:64px;display:flex;flex-direction:column;align-items:center;gap:14px;padding:12px 8px;border:1px solid #aaa;background:#fafafa;border-radius:0}
.home .roster .roster-title,.portrait .home .roster .roster-title{font-size:11px;padding:0;background:none;white-space:nowrap}.home .roster-avatar,.portrait .home .roster-avatar{display:grid;width:38px;height:38px;place-items:center;border:1px solid #999;background:#e5e5e5;font-size:17px}
.home-activities{left:32px;right:164px;bottom:24px;display:flex;justify-content:center;gap:16px}.home-activities .activity{flex:none;width:106px;height:106px;padding:10px;display:flex;flex-direction:column;justify-content:center;align-items:center;gap:8px;text-align:center;border-radius:0}.activity strong{font-size:16px;line-height:1.5}.activity small{margin:0;font-size:12px}
.portrait .home .roster{top:158px;right:16px;width:64px}.portrait .home-activities{left:22px;right:22px;bottom:48px;gap:10px;display:flex}.portrait .home-activities .activity{width:91px;height:91px;padding:7px;gap:6px}.portrait .activity strong{font-size:15px}.portrait .activity small{font-size:12px}

/* Existing 3D practice controls, using saved game coordinates at half logical scale. */
.existing-practice{position:relative;height:100%;background:#e7e7e7;overflow:hidden}.practice-outline{position:absolute;inset:0;width:100%;height:100%}.practice-top{position:absolute;left:0;right:0;top:0;height:48px;padding:6px 18px;background:#fafafa;border-bottom:1px solid #bbb;display:flex;align-items:center;gap:16px;z-index:3}.practice-top strong{flex:1;font-size:18px}.practice-top button{min-height:32px;padding:5px 14px}.existing-control{position:absolute;background:#fafafa;border:1px solid #999;border-radius:4px;display:flex;align-items:center;justify-content:center;z-index:2}.existing-control button,.existing-control summary{font-size:inherit;min-height:0;width:100%;height:100%;padding:0 4px;border:0;border-radius:0;background:transparent;white-space:nowrap}.existing-control details{width:100%;height:100%;position:relative}.existing-control summary{display:flex;align-items:center;justify-content:center;list-style:none;cursor:pointer}.existing-control summary::-webkit-details-marker{display:none}.existing-control:has(details[open]){z-index:5}.practice-pullup{position:absolute;bottom:calc(100% + 8px);left:0;width:145px;max-height:380px;overflow:auto;border:1px solid #888;background:white;padding:5px;box-shadow:0 3px 14px #0002}.practice-pullup button{height:32px;text-align:left;padding:5px 10px}.practice-pullup small{display:block;color:#777;font-size:11px;padding:5px 8px;background:#eee}.existing-stat{justify-content:flex-start;padding:0 14px;gap:14px}.existing-stat b{font-size:22px}.existing-views button+button{border-left:1px solid #aaa}.existing-views .active{background:#ccc}.existing-power{padding:10px;background:#ddd}.practice-pull{writing-mode:vertical-lr;direction:rtl;height:100%;width:100%;padding:0;background:none}.existing-tip{border-radius:50%;background:radial-gradient(circle,#ccc 0 5%,transparent 6%),linear-gradient(transparent 49%,#aaa 50%,transparent 51%),linear-gradient(90deg,transparent 49%,#aaa 50%,transparent 51%);border:2px solid #aaa}.existing-tip .practice-tip{border-radius:50%;font-size:22px;color:#666}.placement-state{position:absolute;top:62px;left:42%;background:white;padding:8px;border:1px solid #aaa}.portrait .practice-pullup{max-height:500px;width:165px}.portrait .practice-pullup button{height:40px}.portrait .practice-outline{height:82%;top:10%}

.existing-views button.active{background:#ccc;color:#222}

.room-config{width:100%;max-width:800px;margin:0 auto}.room-option{display:flex;align-items:center;gap:24px;padding:16px 0;border-bottom:1px solid #ccc;min-height:74px}.room-option>strong{width:100px;flex:none;font-size:17px}.room-choice{display:flex;gap:0;flex:1;border:0;border-radius:6px;overflow:hidden}.room-choice button{flex:1;min-width:0;min-height:44px;padding:8px 6px;font-size:16px;white-space:nowrap}.room-stepper{display:flex;align-items:center;gap:16px;max-width:320px;flex:1}.room-stepper button{width:52px;min-height:44px;font-size:25px;padding:0}.room-stepper output{flex:1;text-align:center;font-size:18px;white-space:nowrap}.room-practice-bar{position:absolute;top:58px;left:22px;right:22px;z-index:3;display:flex;align-items:center;justify-content:space-between;gap:14px;background:#fafafaeb;border:1px solid #bbb;padding:10px 14px;font-size:13px}.room-practice-bar>div{display:flex;gap:8px}.room-practice-bar button{font-size:14px;padding:8px 12px}.portrait .room-option{display:block;padding:20px 0;min-height:110px}.portrait .room-option>strong{display:block;width:auto;margin-bottom:14px}.portrait .room-choice{gap:0}.portrait .room-choice button{min-height:48px;font-size:14px;padding:7px 3px}.portrait .room-stepper{max-width:none}.portrait .room-practice-bar{flex-direction:column;align-items:stretch;top:60px;font-size:13px}.portrait .room-practice-bar>div button{flex:1}.room-config+.actions{max-width:800px;width:100%;margin-left:auto;margin-right:auto}

#toast{pointer-events:none}

.challenge-result{text-align:center}.challenge-result>p{margin:0 0 12px}.challenge-name{font-size:20px;font-weight:600}.challenge-reward{display:flex;align-items:center;justify-content:space-between;gap:16px;border:1px solid #bbb;background:#eee;padding:18px;margin:22px 0}.challenge-reward>div{text-align:left}.challenge-reward strong{display:block;font-size:15px}.challenge-reward span{display:block;font-size:26px;font-weight:600;margin-top:8px}.challenge-reward button{white-space:nowrap;min-height:46px}.reward-claimed{background:#e3e3e3;color:#777;border-color:#bbb}.challenge-result .actions button{min-height:46px}

/* Global navigation belongs to the lobby; child headers stay above scrolling content. */
.page-header{min-height:46px}.available-coins{font-size:16px;white-space:nowrap}.match-network{font-size:12px;min-height:30px;padding:4px 7px;background:transparent;border:0;color:#555}.portrait .available-coins{font-size:14px}.portrait .page-header{flex-wrap:wrap}.page-content{overscroll-behavior:contain}

.room-choice button{border:0;border-radius:0}.room-choice button+button{border-left:1px solid #999}.room-choice button:focus-visible{outline:2px solid #555;outline-offset:-3px}

.email-code-row{display:flex;gap:8px;margin-top:6px}.email-code-row input{min-width:0;flex:1}.email-code-row button{width:116px;flex:none;font-size:14px;white-space:nowrap}.code-label{display:block;margin-top:18px;margin-bottom:6px}.avatar-editor{border:0;padding:0;margin:20px 0}.avatar-editor legend{margin-bottom:10px}.avatar-options{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.avatar-options>button{width:56px;height:56px;padding:0}.avatar-symbol{font-size:28px;line-height:1}.avatar-upload{border:1px solid #aaa;position:relative;padding:16px 10px;cursor:pointer;font-size:13px;overflow:hidden}.avatar-upload input{position:absolute;inset:0;opacity:0;width:100%;cursor:pointer}.avatar-options img,#uploadedAvatar img,.profile-avatar img{width:64px;height:64px;object-fit:cover;border-radius:50%}#uploadedAvatar:empty{display:none}#uploadedAvatar{margin-top:12px}.avatar img{width:100%;height:100%;object-fit:cover;border-radius:50%}.avatar .avatar-symbol{font-size:20px}.profile-layout{display:grid;grid-template-columns:150px minmax(0,1fr);gap:24px;min-height:100%}.profile-tabs{display:flex;flex-direction:column;gap:8px;border-right:1px solid #bbb;padding-right:16px}.profile-tabs button{text-align:left;min-height:48px}.profile-panel{min-width:0}.profile-stat-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.profile-stat-grid>div{padding:18px;border:1px solid #bbb;background:#fff}.profile-stat-grid small{display:block}.profile-stat-grid b{display:block;font-size:28px;margin-top:12px}.profile-identity{display:flex;align-items:center;gap:16px;margin-bottom:22px}.profile-avatar{display:grid;place-items:center;width:68px;height:68px;border:1px solid #aaa;border-radius:50%}.portrait .profile-layout{grid-template-columns:100px minmax(0,1fr);gap:14px}.portrait .profile-tabs{padding-right:10px}.portrait .profile-tabs button{font-size:14px;padding:8px}.portrait .profile-stat-grid{grid-template-columns:repeat(2,1fr);gap:10px}.portrait .profile-stat-grid>div{padding:12px}.portrait .profile-panel .row{flex-wrap:wrap}.portrait .profile-panel .row span{overflow-wrap:anywhere}

.message-card{display:flex;align-items:center;justify-content:space-between;gap:20px;border:1px solid #bbb;background:#fff;padding:18px;margin-bottom:14px}.message-copy{min-width:0}.message-copy strong{display:block;margin:7px 0;font-size:18px}.message-copy p{font-size:14px;color:#666}.message-actions{display:flex;gap:10px;flex-shrink:0}.message-actions button{min-width:76px;min-height:42px}.message-card small{color:#777}#inviteNotification{position:absolute;top:14px;left:50%;transform:translateX(-50%);width:610px;max-width:calc(100% - 32px);z-index:9;pointer-events:none}.invite-notice{pointer-events:auto;background:#fafafa;border:1px solid #888;box-shadow:0 7px 18px #0003;padding:14px 18px;animation:inviteSlide .25s ease-out}.notice-heading{display:flex;align-items:center;justify-content:space-between;gap:12px}.notice-heading strong{font-size:19px}.notice-heading button{border:0;background:transparent;min-height:28px;padding:0 6px;font-size:24px}.invite-notice p{font-size:14px;margin:7px 0 12px;color:#555}.invite-notice .message-actions{justify-content:flex-end}.portrait .message-card{align-items:stretch;flex-direction:column;gap:14px}.portrait .message-actions{justify-content:flex-end}.portrait #inviteNotification{width:calc(100% - 32px)}@keyframes inviteSlide{from{transform:translateY(-130%);opacity:0}to{transform:translateY(0);opacity:1}}@media(prefers-reduced-motion:reduce){.invite-notice{animation:none}}

.topbar .network{display:flex;align-items:center;justify-content:center;gap:6px}.signal-bars{display:inline-flex;align-items:flex-end;gap:2px;height:18px;flex:none}.signal-bars i{display:block;width:4px;border:1px solid #888;background:transparent;height:5px}.signal-bars i:nth-child(2){height:9px}.signal-bars i:nth-child(3){height:13px}.signal-bars i:nth-child(4){height:18px}.signal-bars i.filled{background:#555;border-color:#555}.portrait .topbar .network{gap:4px}.portrait .signal-bars{transform:scale(.8);transform-origin:center}.portrait .topbar button{font-size:11px}

.social-tabs{display:flex;margin-bottom:18px}.social-tabs button{flex:1;border-radius:0}.social-tabs button+button{border-left:0}.social-tabs button:first-child{border-radius:4px 0 0 4px}.social-tabs button:last-child{border-radius:0 4px 4px 0}.social-search{display:block;margin-bottom:12px}#playerList [hidden]{display:none}#overlay[data-drawer=invite-player] .chat-panel{left:auto;right:0}#overlay:is([data-drawer=player],[data-drawer=duel-profile]) .profile-stat-grid{grid-template-columns:repeat(2,minmax(0,1fr))}#overlay:is([data-drawer=player],[data-drawer=duel-profile]) .profile-stat-grid>div{padding:10px}#overlay:is([data-drawer=player],[data-drawer=duel-profile]) .profile-stat-grid b{font-size:24px;margin-top:6px}

/* Game headers overlay the scene; text remains fully legible. */
#game{position:relative}.practice-top,.match-hud.live-hud{background:rgba(250,250,250,.38);border-bottom:1px solid rgba(120,120,120,.25)}.practice-top button,.live-hud button{background:rgba(255,255,255,.32);border-color:rgba(110,110,110,.4)}.practice-top button:hover,.live-hud button:hover{background:rgba(255,255,255,.55)}.live-hud{position:absolute;top:0;left:0;right:0;z-index:3;min-height:58px}.live-hud+.table-area{margin-top:0}.live-hud .tag{background:rgba(255,255,255,.3)}.room-practice-bar{background:rgba(250,250,250,.38);border-color:rgba(120,120,120,.3)}.room-practice-bar button,.room-practice-bar button.primary{background:rgba(255,255,255,.32);color:#222;border-color:rgba(110,110,110,.4)}

.existing-replay .replay-back{position:absolute;top:6px;left:18px;z-index:3}.replay-back button{min-height:32px;padding:5px 14px;background:rgba(255,255,255,.32);border-color:rgba(110,110,110,.4)}.replay-existing-cell{position:absolute;display:flex;align-items:center;justify-content:center;gap:8px;z-index:2}.replay-existing-cell>button{width:100%;height:100%;min-height:0;padding:0;font-size:inherit;border-radius:4px;background:rgba(250,250,250,.42);border:1px solid #999}.replay-meta{background:rgba(250,250,250,.42);border:1px solid #999;border-radius:4px;white-space:nowrap}.replay-views{gap:0;border:1px solid #999;border-radius:4px;overflow:hidden}.replay-views>button{border:0;border-radius:0}.replay-views>button+button{border-left:1px solid #999}.replay-views>button.active{background:rgba(140,140,140,.55)}.replay-existing-cell>button:disabled{opacity:.35}

/* A compact in-game menu replaces the navigation strip. */
.game-menu{position:absolute;top:10px;left:14px;z-index:7}.game-menu>summary{list-style:none;display:flex;align-items:center;justify-content:center;width:44px;height:44px;border:1px solid #8888;border-radius:5px;background:#ffffff55;cursor:pointer}.game-menu>summary::-webkit-details-marker{display:none}.game-menu>summary:hover,.game-menu[open]>summary{background:#ffffff99}.game-menu-items{position:absolute;top:50px;left:0;width:124px;display:flex;flex-direction:column;background:#f5f5f5ed;border:1px solid #999;border-radius:5px;box-shadow:0 4px 10px #0002;overflow:hidden}.game-menu-items button{border:0;border-radius:0;text-align:left;min-height:44px;padding:10px 18px;background:transparent}.game-menu-items button+button{border-top:1px solid #ccc}.game-menu-items button:hover{background:#ddd}.match-hud.live-hud{left:76px;right:18px;top:10px;min-height:44px;padding:0;border:0;background:transparent;pointer-events:none}.live-hud>*{pointer-events:auto}.live-hud .score,.live-hud .clock{background:#ffffff55;border-radius:4px;padding:5px 8px}.portrait .match-hud.live-hud{gap:8px;padding:0}.room-practice-bar{top:12px;left:76px;right:18px;border:0;background:transparent;padding:0}.portrait .room-practice-bar{top:12px;left:76px;right:18px}.game-menu-items button:focus-visible,.game-menu>summary:focus-visible{outline:2px solid #555;outline-offset:-3px}

.coin-amount{display:inline-flex;align-items:center;justify-content:center;gap:.3em;white-space:nowrap;vertical-align:middle}.coin-icon{width:1.15em;height:1.15em;flex:none}.ranked-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px;height:100%;min-height:340px}.ranked-field{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;background:#fafafa;border:1px solid #999;padding:18px}.ranked-field strong{font-size:25px}.ranked-field .field-stake{font-size:27px}.ranked-field small{color:#666}.ranked-field:hover{background:#e8e8e8}.locked-field{background:#e2e2e2}.field-lock{position:absolute;right:16px;top:16px;width:25px;height:25px}.portrait .ranked-fields{gap:14px;min-height:450px}.portrait .ranked-field{padding:16px 8px}.portrait .ranked-field strong{font-size:23px}.challenge-reward .coin-amount{display:inline-flex}.challenge-reward .coin-amount>span{margin:0;font-size:inherit}

/* Roster reserves the full lobby height, including empty space. */
.home .roster,.portrait .home .roster{top:12px;bottom:12px;height:auto;justify-content:flex-start;flex-shrink:0}.home .roster-avatar{flex-shrink:0}.portrait .home-activities{right:100px;left:22px;bottom:24px;display:grid;grid-template-columns:repeat(3,106px);justify-content:center;gap:12px}.portrait .home-activities .activity{width:106px;height:106px}
/* Player profile: every statistic and action fits within the current orientation. */
#overlay:is([data-drawer=player],[data-drawer=duel-profile]) .dialog{width:760px;max-width:calc(100% - 32px);max-height:calc(100% - 32px)}#overlay:is([data-drawer=player],[data-drawer=duel-profile]) .dialog-head{flex-shrink:0;padding:12px 18px}#overlay:is([data-drawer=player],[data-drawer=duel-profile]) .dialog-body{overflow:visible;padding:16px 20px}#overlay:is([data-drawer=player],[data-drawer=duel-profile]) .profile-identity{margin-bottom:14px}#overlay:is([data-drawer=player],[data-drawer=duel-profile]) .profile-identity h2{font-size:22px;overflow-wrap:anywhere}#overlay:is([data-drawer=player],[data-drawer=duel-profile]) .profile-stat-grid{grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}#overlay:is([data-drawer=player],[data-drawer=duel-profile]) .profile-stat-grid>div{padding:12px;min-height:86px}#overlay:is([data-drawer=player],[data-drawer=duel-profile]) .profile-stat-grid small{font-size:14px;white-space:nowrap}#overlay:is([data-drawer=player],[data-drawer=duel-profile]) .profile-stat-grid b{font-size:28px;margin-top:8px}#overlay:is([data-drawer=player],[data-drawer=duel-profile]) .actions{margin-top:16px}.portrait #overlay:is([data-drawer=player],[data-drawer=duel-profile]) .dialog{width:492px}.portrait #overlay:is([data-drawer=player],[data-drawer=duel-profile]) .dialog-body{padding:18px}.portrait #overlay:is([data-drawer=player],[data-drawer=duel-profile]) .profile-stat-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.portrait #overlay:is([data-drawer=player],[data-drawer=duel-profile]) .profile-stat-grid>div{min-height:98px;padding:16px}.portrait #overlay:is([data-drawer=player],[data-drawer=duel-profile]) .actions button{min-height:44px}

.home-activities .activity{position:relative;overflow:hidden}.home-activities .activity-cooldown{background:#d5d5d5;border-color:#bbb;color:#888;opacity:1;cursor:default}.activity-cooldown>strong,.activity-cooldown>small{opacity:.35}.activity-countdown{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;background:#ddd9;color:#555;pointer-events:none}.activity-countdown svg{width:30px;height:30px}.activity-countdown time{font-size:15px;font-variant-numeric:tabular-nums;font-weight:600;white-space:nowrap}

#overlay:is([data-drawer=player],[data-drawer=duel-profile]) .player-actions button{white-space:nowrap;padding:8px 12px}.portrait #overlay:is([data-drawer=player],[data-drawer=duel-profile]) .player-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}

.field-stake{display:flex;align-items:center;justify-content:center}.stake-label{font-size:16px}.field-conditions{white-space:nowrap;font-size:14px}.portrait .ranked-field .field-stake{font-size:24px}.portrait .field-conditions{font-size:13px}

.home-activities,.portrait .home-activities{display:flex;justify-content:center;gap:16px}.challenge-progress{font-size:24px;font-variant-numeric:tabular-nums}#overlay[data-drawer=training-challenges] .dialog{width:680px;max-width:calc(100% - 28px)}#overlay[data-drawer=training-challenges] .dialog-body{padding:12px 18px}.challenge-list{display:flex;flex-direction:column;gap:10px}.challenge-item{display:grid;grid-template-columns:minmax(0,1fr) 88px 136px;gap:16px;align-items:center;min-height:76px;border:1px solid #bbb;background:#fafafa;padding:12px 16px}.challenge-copy strong{display:block;font-size:18px}.challenge-copy small{display:block;font-size:12px;margin-top:5px;color:#666}.challenge-entry button{width:100%;min-height:44px}.challenge-cooling{background:#e1e1e1;color:#777}.challenge-cooling .challenge-copy,.challenge-cooling .challenge-amount{opacity:.6}.challenge-cooldown{position:relative;display:flex;flex-direction:column;gap:3px;align-items:center;justify-content:center;background:#d5d5d5;opacity:1;color:#777;padding:5px;font-size:12px}.inline-countdown{display:flex;align-items:center;gap:5px;color:#555}.inline-countdown svg{width:20px;height:20px}.inline-countdown time{font-size:14px;font-variant-numeric:tabular-nums}.portrait #overlay[data-drawer=training-challenges] .dialog{width:492px}.portrait .challenge-item{grid-template-columns:minmax(0,1fr) 64px 114px;gap:8px;min-height:100px;padding:12px}.portrait .challenge-copy strong{font-size:16px}.portrait .challenge-amount{font-size:14px}

.gear-layout{display:grid;grid-template-columns:140px minmax(0,1fr);gap:24px;height:100%}.gear-categories{display:flex;flex-direction:column;gap:5px;overflow:auto;border-right:1px solid #bbb;padding-right:12px}.gear-categories button{min-height:38px;text-align:left;padding:7px 12px}.gear-content h2{margin-bottom:18px}.gear-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}.gear-card{display:flex;flex-direction:column;align-items:center;gap:14px;padding:18px;background:#fafafa;min-width:0}.gear-placeholder{display:grid;place-items:center;font-size:58px;width:100%;height:110px;background:#e4e4e4}.gear-detail-art{display:grid;place-items:center;height:160px;background:#e4e4e4;font-size:68px;margin-bottom:16px}.portrait .gear-layout{grid-template-columns:104px minmax(0,1fr);gap:16px}.portrait .gear-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.portrait .gear-card{padding:12px 8px}.portrait .gear-card strong{font-size:14px}.portrait .gear-placeholder{height:96px}.portrait .topbar .identity{flex:1}.portrait .topbar>button{padding:7px 2px}.portrait .topbar{gap:2px;padding-left:8px;padding-right:8px}

/* Unified touch dialog: title only, scrollable content, persistent bottom actions. */
.dialog-head{flex-shrink:0}.dialog-body{min-height:0;flex:1}.dialog-footer{flex-shrink:0;padding:12px 18px 16px;border-top:0}.dialog-footer .actions{margin:0;flex-wrap:wrap}.dialog-footer .actions button{min-height:44px;flex:1;white-space:nowrap}.dialog-footer .actions:empty{display:none}.dialog-body:empty{display:none}#overlay[data-drawer=practice-leave] .dialog-body{padding:0}.portrait .dialog.chat-panel{width:calc(100% - 40px);max-width:calc(100% - 40px)}.decision-resume{position:absolute;top:80px;left:50%;transform:translateX(-50%);z-index:4}.notice-bottom{display:flex;align-items:center;justify-content:flex-end;gap:10px}.notice-bottom button{min-height:40px}#overlay:is([data-drawer=player],[data-drawer=duel-profile]) .dialog-footer .player-actions{margin:0}.portrait #overlay:is([data-drawer=player],[data-drawer=duel-profile]) .dialog-footer .player-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}

.gear-card .gear-preview{display:flex;flex-direction:column;align-items:center;gap:14px;border:0;background:transparent;padding:0;width:100%;min-width:0}.gear-card>.gear-card-state{min-height:24px;display:flex;align-items:center;justify-content:center}.gear-card>button:not(.gear-preview){width:100%;min-height:42px}.gear-unowned .gear-placeholder{background:#dedede}.gear-unowned{border:1px dashed #999}.gear-card{border:1px solid #aaa}.gear-card .gear-preview:hover{background:transparent}.gear-unowned{border-style:dashed}

/* Brief confirmations use one centered message and a bottom action row. */
#overlay .simple-dialog,.portrait #overlay .simple-dialog{width:420px;max-width:calc(100% - 40px);min-height:190px;box-shadow:0 8px 24px #0002}.simple-dialog .dialog-head{border:0;text-align:center;justify-content:center;padding:34px 24px 22px;min-height:112px}.simple-dialog .dialog-head h2{font-size:23px;line-height:1.5}.simple-dialog .dialog-body{display:none}.simple-dialog .dialog-footer{border:0;padding:8px 24px 24px}.simple-dialog .dialog-footer .actions{gap:12px}.simple-dialog .dialog-footer button{min-height:46px}
.challenge-item{grid-template-columns:minmax(0,1fr) 76px 92px 112px;gap:10px}.challenge-entry button{min-height:40px}.challenge-reward-entry{display:flex;justify-content:center;align-items:center}.challenge-reward-entry button{width:100%;min-height:40px}.challenge-reward-entry .inline-countdown{font-size:12px}.challenge-entry button:disabled{color:#777;background:#ddd}.portrait .challenge-item{grid-template-columns:minmax(0,1fr) 66px 100px;gap:10px;min-height:98px}.portrait .challenge-copy{grid-column:1}.portrait .challenge-reward-entry{grid-column:2 / 4;justify-content:flex-end}.portrait .challenge-reward-entry:empty{display:none}.portrait .challenge-reward-entry button{width:100px}.portrait .challenge-reward-entry .inline-countdown{width:110px;justify-content:center}
.fullscreen-button{display:flex;align-items:center;justify-content:center;width:44px;height:44px;padding:10px;background:#ffffff55;border:1px solid #8888;border-radius:5px;z-index:6}.fullscreen-button svg{width:22px;height:22px}.topbar>.fullscreen-button{flex:0 0 40px}.portrait .topbar>.fullscreen-button{flex:0 0 32px;padding:5px}#game>.fullscreen-button{position:absolute;right:14px;top:10px}.match-hud.live-hud{right:76px}.room-practice-bar,.portrait .room-practice-bar{right:76px}#stage:fullscreen{width:100vw!important;height:100vh!important;border:0;margin:0;background:#ddd}.fullscreen-button:focus-visible{outline:2px solid #555}

.claimed-reward{display:flex;flex-direction:column;align-items:center;gap:3px}.claimed-reward>small{font-size:11px;color:#777}

.settings-segment{display:flex;gap:0;border:0;border-radius:6px;overflow:hidden;flex:none}.settings-segment button{min-width:66px;min-height:42px;border:0;border-radius:0;padding:8px 12px}.settings-segment button+button{border-left:1px solid #999}.settings-segment button.active{background:#ccc}.settings-segment button:focus-visible{outline:2px solid #555;outline-offset:-3px}

/* Loading wireframe: single control in a fixed position. */
.room-loading{height:100%;position:relative;display:flex;align-items:flex-end;justify-content:center;padding:0 32px 64px;text-align:center;overflow:hidden}
.load-background{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
.room-load-control{position:relative;width:420px;max-width:100%;display:flex;flex-direction:column;gap:18px}
.room-load-track,.room-load-control>.load-start{position:relative;width:100%;height:52px;min-height:52px;border:1px solid #888;background:#fafafa;overflow:hidden;border-radius:4px;font-size:20px}
.room-load-track>span{position:absolute;inset:0 auto 0 0;background:#bcbcbc;transition:width .25s linear}
.room-load-track>strong{position:relative;display:grid;place-items:center;height:100%;font-variant-numeric:tabular-nums}
.load-tip{font-size:16px;line-height:1.5;min-height:48px;color:#555;margin:0}
.portrait .room-loading{padding:0 40px 110px}.portrait .room-load-control{width:100%}

/* Player drawer: compact identity rows and header collapse. */
.room-practice-bar,.portrait .room-practice-bar{left:auto;display:flex;justify-content:flex-end;width:auto}
.social-head-actions{display:flex;align-items:center;gap:8px;margin-left:auto}.social-head-actions button{min-height:44px;font-size:14px;white-space:nowrap}.social-head-actions .drawer-collapse{width:44px;padding:8px;font-size:24px}
.social-player-row{gap:12px}.social-avatar{flex:0 0 44px;width:44px;height:44px;padding:0;background:#ddd;border:1px solid #aaa}.social-player-info{flex:1;min-width:0}.social-player-info>.linkbtn{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.social-player-info small{display:block}
#overlay[data-drawer=online] .chat-panel,#overlay[data-drawer=online-empty] .chat-panel,#overlay[data-drawer=invite-player] .chat-panel{width:420px;animation:none}
@keyframes player-drawer-in{from{transform:translateX(100%)}to{transform:translateX(0)}}
@media(prefers-reduced-motion:reduce){#overlay .chat-panel{animation:none!important}}

.room-wait-status{position:absolute;top:21px;left:76px;font-size:16px;color:#444;pointer-events:none}.portrait .room-wait-status{font-size:16px}

/* Static wireframe drawers and compact player profile. */
.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
#overlay[data-drawer=online] .dialog-head,#overlay[data-drawer=online-empty] .dialog-head,#overlay[data-drawer=invite-player] .dialog-head{height:54px;min-height:54px;padding:5px 12px;display:flex;align-items:center;justify-content:space-between}
#overlay .drawer-collapse{width:44px;height:44px;min-height:44px;padding:4px;border:1px solid #aaa;background:#eee;font-size:24px}
#overlay .copy-invite-button{display:inline-flex;border:1px solid #888;border-radius:4px;padding:8px 12px;min-height:38px;background:#eee;color:#222;font-size:14px}
#overlay .chat-panel,#overlay .social-tabs *,#playerList{animation:none!important;transition:none!important}
#playerList .social-player-row{min-height:60px;padding:7px 0}#playerList .social-avatar{width:40px;height:40px;flex-basis:40px}
#overlay:is([data-drawer=player],[data-drawer=duel-profile]) .dialog-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:14px 18px}
#overlay:is([data-drawer=player],[data-drawer=duel-profile]) .dialog-head>button{min-height:38px;padding:7px 10px;font-size:14px;white-space:nowrap}
#overlay:is([data-drawer=player],[data-drawer=duel-profile]) .profile-identity{margin:0;padding:0;display:flex;align-items:center;gap:10px;min-width:0}
#overlay:is([data-drawer=player],[data-drawer=duel-profile]) .profile-identity h2{font-size:20px;margin:0;max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#overlay:is([data-drawer=player],[data-drawer=duel-profile]) .profile-identity small{display:block;margin-top:4px}
#overlay:is([data-drawer=player],[data-drawer=duel-profile]) .profile-stat-grid{grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
#overlay:is([data-drawer=player],[data-drawer=duel-profile]) .profile-stat-grid>div{padding:12px 8px}
.profile-stat-grid .match-stat>div{display:flex;justify-content:center;gap:12px;margin-top:8px}.profile-stat-grid .match-stat span{font-size:13px}.profile-stat-grid .match-stat b{font-size:22px}
#overlay:is([data-drawer=player],[data-drawer=duel-profile]) .dialog-footer .player-actions{display:flex;justify-content:flex-end;gap:12px}
#overlay:is([data-drawer=player],[data-drawer=duel-profile]) .dialog-footer .player-actions button{flex:0 0 136px}
.portrait #overlay:is([data-drawer=player],[data-drawer=duel-profile]) .profile-stat-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
.portrait #overlay:is([data-drawer=player],[data-drawer=duel-profile]) .profile-identity{flex-direction:column;gap:5px;text-align:center}.portrait #overlay:is([data-drawer=player],[data-drawer=duel-profile]) .profile-identity h2{max-width:190px}

/* Keep the same identity and statistics alignment in both orientations. */
#overlay:is([data-drawer=player],[data-drawer=duel-profile]) .dialog-head{align-items:center;gap:10px;padding:12px}
#overlay:is([data-drawer=player],[data-drawer=duel-profile]) .profile-identity,.portrait #overlay:is([data-drawer=player],[data-drawer=duel-profile]) .profile-identity{flex-direction:row;flex:1;align-items:center;gap:8px;text-align:left;min-width:0}
#overlay:is([data-drawer=player],[data-drawer=duel-profile]) .profile-identity .avatar{flex:0 0 40px;width:40px;height:40px}
#overlay:is([data-drawer=player],[data-drawer=duel-profile]) .profile-identity h2,.portrait #overlay:is([data-drawer=player],[data-drawer=duel-profile]) .profile-identity h2{font-size:18px;min-width:0;max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#overlay:is([data-drawer=player],[data-drawer=duel-profile]) .profile-identity small{margin:0;white-space:nowrap;flex-shrink:0;font-size:13px}
.profile-relationship-actions{display:flex;align-items:center;gap:8px;flex-shrink:0}.profile-relationship-actions button{min-height:40px;padding:7px 10px;font-size:14px;white-space:nowrap}
.profile-stat-grid .match-stat>div{display:flex;flex-direction:column;align-items:stretch;gap:6px;margin-top:8px}
.profile-stat-grid .match-stat span{display:flex;align-items:center;justify-content:space-between;gap:12px}
.profile-stat-grid .match-stat span b{display:inline;margin:0;font-size:22px;line-height:1.15}

.level-badge{display:inline-flex;align-items:center;border:1px solid #aaa;border-radius:3px;padding:2px 5px;font-size:12px;font-weight:600;white-space:nowrap;background:#eee;flex-shrink:0}
.level-progress{display:flex;align-items:center;gap:12px;width:100%;padding:12px;margin:0 0 14px;text-align:left;background:#fafafa}.level-progress progress{flex:1;min-width:30px;height:10px;accent-color:#888}.level-progress>span:last-child{font-size:14px;white-space:nowrap}
.level-rules{font-size:15px;line-height:1.6}.level-rules p{margin:8px 0}.level-celebration{text-align:center;display:grid;gap:18px;justify-items:center;padding:22px}.level-celebration>.level-badge{font-size:34px;padding:10px 24px}.level-celebration small{color:#666}
#overlay:is([data-drawer=player],[data-drawer=duel-profile]) .profile-identity{gap:5px}
#screen #overlay .profile-identity :is(.level-badge,.status-badge){box-sizing:border-box;flex:none;height:22px;width:max-content;line-height:18px;padding:1px 6px}
#screen #overlay [data-invite][aria-disabled="true"]{background:#263039;color:#a0aab4;box-shadow:none;cursor:default}

.gear-overview-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.gear-overview-item{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:7px;padding:10px;min-height:110px;background:#fafafa;border:1px solid #aaa}.gear-overview-item small{font-size:13px;color:#666}.gear-overview-item .gear-placeholder{font-size:28px;height:30px;margin:0}.gear-overview-item strong{font-size:15px}.portrait .gear-overview-grid{grid-template-columns:repeat(2,minmax(0,1fr))}

.match-practice-backdrop{position:absolute;inset:0}.match-found-overlay{position:absolute;inset:0;z-index:9;background:#eeeeeea6}.match-found-center{position:absolute;inset:120px 0 0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px}.match-found-center h2{font-size:30px}.match-found-center>strong{font-size:34px}.ranked-player-header{position:absolute;top:10px;left:76px;right:76px;display:flex;justify-content:space-between;gap:14px;z-index:4;pointer-events:none}.ranked-contestant{display:flex;align-items:center;gap:12px;background:#ffffff66;padding:8px 12px;border-radius:4px}.ranked-contestant .avatar{width:36px;height:36px;flex-shrink:0}.ranked-contestant strong{font-size:17px}.ranked-player-header+.match-hud.live-hud{top:78px}.portrait .ranked-player-header{left:64px;right:16px;gap:8px}.portrait .ranked-contestant{gap:5px;padding:6px}.portrait .ranked-contestant strong{font-size:14px}.portrait .ranked-contestant .avatar{width:28px;height:28px}.portrait .ranked-contestant .coin-value{font-size:14px}

.observation-stick{position:absolute;z-index:3;border:1px solid #999;border-radius:50%;padding:0;min-height:0;background:#ffffff66;touch-action:none}.observation-stick>span{position:absolute;width:40%;height:40%;left:calc(30% + var(--pad-x,0%));top:calc(30% + var(--pad-y,0%));border:1px solid #888;border-radius:50%;background:#bbb}
.practice-tip{position:relative;touch-action:none}.tip-marker{position:absolute;width:10px;height:10px;border-radius:50%;background:#666;left:calc(50% - 5px + var(--pad-x,0%));top:calc(50% - 5px + var(--pad-y,0%))}.existing-control:has(button:disabled),.existing-power:has(input:disabled){opacity:.5}
.duel-score{position:absolute;left:50%;top:80px;transform:translateX(-50%);display:flex;align-items:center;gap:16px;padding:7px 12px;background:#ffffff66;border-radius:4px;z-index:3;white-space:nowrap}.duel-score strong{font-size:23px}.duel-score small{font-size:14px}.decision-resume{top:130px}

/* All product actions retain a visible touch target; preview navigation is separate. */
#screen button{border-style:solid;border-width:1px;border-color:#aaa}
#screen button:focus-visible{outline:3px solid #555;outline-offset:2px}
#screen .linkbtn,#screen .quiet,#screen .topbar>button,#screen .network,#screen .game-menu-items button,#screen .gear-preview{background:#f2f2f2;border:1px solid #aaa;text-decoration:none}
#screen .linkbtn{padding:6px 10px;min-height:40px;border-radius:4px}
#screen .existing-control button,#screen .replay-existing-cell>button{background:#ffffff55;border-color:#9998}
#screen .existing-views button.active,#screen .replay-views>button.active{background:#ccc}
#screen .profile-relationship-actions button{border:1px solid #999;background:#eee;border-radius:4px;min-height:40px;padding:7px 10px;font-size:14px}
#screen .social-tabs button.active,#screen .room-choice button.active,#screen .settings-segment button.active{background:#333;color:#fff;border-color:#333}
#overlay[data-drawer=online] .chat-panel,#overlay[data-drawer=online-empty] .chat-panel,#overlay[data-drawer=invite-player] .chat-panel{width:360px;max-width:calc(100% - 40px)}
#playerList .social-player-row{gap:8px}#playerList .social-player-info>.linkbtn{font-size:14px;padding:5px 7px;min-height:36px}#playerList .social-player-row>button:last-child{min-width:70px;padding:7px 10px}
#overlay:is([data-drawer=player],[data-drawer=duel-profile]) .dialog{width:680px}.portrait #overlay:is([data-drawer=player],[data-drawer=duel-profile]) .dialog{width:492px}

/* Names are content links; actions remain framed buttons. */
#screen #playerList .social-player-info>.linkbtn{border:0;background:transparent;text-decoration:none;padding:3px 0;text-align:left}
.online-game-top{position:absolute;inset:0 0 auto;height:62px;z-index:7;display:flex;align-items:center;gap:12px;padding:8px 12px;background:#f4f4f4aa;border-bottom:1px solid #9996}.online-game-top .game-menu{position:relative;inset:auto;flex-shrink:0}.online-game-status{flex:1;min-width:0}.online-game-status strong{font-size:16px;white-space:nowrap}.online-game-status small{display:block;font-size:13px;white-space:nowrap}.online-game-actions{display:flex;align-items:center;gap:7px}.online-game-actions>button{padding:7px 10px;min-height:40px;background:#ffffff66}.online-game-actions .fullscreen-button{position:static!important}.turn-clock{white-space:nowrap;font-variant-numeric:tabular-nums}.top-view-menu{position:relative}.top-view-menu summary{list-style:none;cursor:pointer;border:1px solid #aaa;border-radius:4px;padding:8px;background:#ffffff66}.top-view-menu>div{position:absolute;right:0;top:44px;width:90px;display:grid;gap:4px;padding:5px;background:#eee;border:1px solid #aaa}
.duel-scoreboard{position:absolute;bottom:0;left:0;right:0;z-index:4;background:#eeeeeedb;border-top:1px solid #888;padding:8px 16px}.scoreboard-main{display:grid;grid-template-columns:minmax(0,1fr) 54px 100px 54px minmax(0,1fr);align-items:center;gap:4px}.scoreboard-player{display:flex;align-items:center;gap:8px;min-width:0;padding:5px 7px}.scoreboard-player.current{box-shadow:inset 4px 0 #555;background:#ddd}.scoreboard-player strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:16px}.scoreboard-player .avatar{width:30px;height:30px;flex-shrink:0}.scoreboard-player.opponent{justify-content:flex-end}.frame-points{text-align:center;font-size:28px;background:#fff;border:1px solid #aaa}.frame-tally{display:flex;align-items:center;justify-content:center;gap:10px;background:#ccc;height:44px}.scoreboard-detail{display:flex;justify-content:space-between;font-size:13px;padding:4px 8px 0}
.portrait .online-game-top{height:108px;align-items:flex-start}.portrait .online-game-status{padding-top:5px}.portrait .online-game-actions{position:absolute;bottom:7px;left:68px;right:10px;justify-content:flex-end;gap:6px}.portrait .online-game-actions>button{padding:5px 8px;font-size:13px;min-height:34px}.portrait .online-game-actions .fullscreen-button{width:34px;height:34px}.portrait .duel-scoreboard{padding:8px}.portrait .scoreboard-main{grid-template-columns:minmax(0,1fr) 40px 68px 40px minmax(0,1fr);gap:2px}.portrait .scoreboard-player{flex-wrap:wrap;gap:4px;padding:4px}.portrait .scoreboard-player strong{font-size:14px}.portrait .scoreboard-player .coin-value{font-size:12px}.portrait .frame-tally{gap:5px;font-size:13px}.portrait .frame-points{font-size:25px}.portrait .scoreboard-detail{font-size:12px}.portrait .decision-resume{top:120px}

/* Compact mobile match HUD. */
.online-game-top,.portrait .online-game-top{height:62px;align-items:center;gap:8px;padding:6px 10px}.online-game-status{display:flex;align-items:center;gap:8px}.online-game-status>.avatar{width:30px;height:30px;flex:0 0 30px}.online-game-status strong{font-size:15px}.online-game-actions,.portrait .online-game-actions{position:static;gap:5px}.match-quick-chat{position:relative;flex-shrink:0}.match-quick-chat>summary{list-style:none;padding:9px;border:1px solid #aaa;border-radius:4px;background:#ffffff66;cursor:pointer}.match-quick-chat>div{position:absolute;top:47px;left:0;width:230px;padding:8px;background:#eee;border:1px solid #999;display:grid;gap:5px;max-height:440px;overflow:auto;z-index:12}.match-quick-chat button{text-align:left;min-height:40px}
.duel-scoreboard,.portrait .duel-scoreboard{padding:6px 12px}.scoreboard-main,.portrait .scoreboard-main{display:grid;grid-template-columns:minmax(0,1fr) 24px minmax(0,1fr);gap:6px}.scoreboard-player,.portrait .scoreboard-player{position:relative;flex-wrap:nowrap;gap:8px;padding:4px 8px;min-width:0;height:48px}.scoreboard-player.current{box-shadow:none;background:#ddd}.scoreboard-player.opponent{justify-content:flex-start}.scoreboard-player strong{flex:1}.score-divider{text-align:center;font-size:24px}.player-clock{font-size:15px;white-space:nowrap}.frame-points,.portrait .frame-points{min-width:38px;font-size:25px;border:0;background:transparent}.turn-arrow{font-size:17px;flex-shrink:0}.floating-break{position:absolute;bottom:calc(100% + 7px);left:0;right:0;height:25px;background:#f3f3f3db;border:1px solid #aaa;font-size:14px;padding:1px 10px}.floating-break b{margin-left:8px}.portrait .scoreboard-player,.portrait .scoreboard-player.opponent{gap:4px;padding:4px}.portrait .scoreboard-player .avatar{width:24px;height:24px}.portrait .scoreboard-player strong{font-size:14px}.portrait .frame-points{min-width:26px;font-size:22px}.portrait .player-clock{font-size:13px}.portrait .online-game-status{gap:4px}.portrait .online-game-status strong{font-size:12px;white-space:normal}.portrait .online-game-actions .network{font-size:10px}.portrait .online-game-actions>button{padding:4px}.portrait .online-game-top .game-menu>summary{width:36px;height:36px}.portrait .match-quick-chat>summary{padding:7px;font-size:13px}
.existing-power{padding:0!important;background:transparent;border:0}.cue-power-control{position:relative;width:100%;height:100%;touch-action:none;min-height:0;border:0!important;background:transparent!important;overflow:hidden}.cue-track{position:absolute;inset:5% 20%;border:1px solid #888;border-radius:14px;background:#bbb6;overflow:hidden}.cue-track>i{position:absolute;left:12%;right:12%;height:1px;background:#999;top:25%}.cue-track>i:nth-child(2){top:50%}.cue-track>i:nth-child(3){top:75%}.cue-shaft{position:absolute;left:40%;width:20%;top:calc(-6% + var(--cue-pull,0%));height:100%;background:linear-gradient(90deg,#888,#eee 45%,#aaa);border:1px solid #888;clip-path:polygon(32% 0,68% 0,100% 100%,0 100%)}.cue-shaft:after{content:'';position:absolute;left:0;right:0;bottom:0;height:28%;background:#777}

.network-control{position:relative;display:inline-flex;flex:0 0 34px;align-items:center;justify-content:center}.network-control .network,#screen .network-control .network{width:34px;height:34px;min-height:34px;padding:6px;display:flex;align-items:center;justify-content:center;background:#ffffff55}.network-popover{position:absolute;right:0;top:calc(100% + 8px);width:150px;padding:10px 12px;border:1px solid #999;border-radius:4px;background:#f5f5f5;box-shadow:0 3px 10px #0002;z-index:30;display:grid;gap:5px;font-size:14px;white-space:nowrap}.network-popover strong{font-size:14px}.portrait .online-game-actions .network{width:30px;height:30px;min-height:30px}

#overlay[data-drawer=match-settlement] .dialog,#overlay[data-drawer=frame-result] .dialog{width:640px;max-width:calc(100% - 32px)}.settlement-versus{display:grid;grid-template-columns:1fr 36px 1fr;align-items:center;text-align:center;gap:12px}.settlement-versus>div{display:flex;flex-direction:column;align-items:center;gap:7px}.settlement-versus .avatar{width:52px;height:52px}.settlement-versus strong{font-size:18px}.settlement-versus b{font-size:44px;line-height:1.15}.versus-colon{font-size:34px}.settlement-stat{display:grid;grid-template-columns:1fr 100px 1fr;text-align:center;background:#e7e7e7;padding:8px;margin-top:14px}.settlement-money{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:12px;text-align:center}.settlement-money>div{display:grid;gap:4px}.settlement-note,.settlement-next{text-align:center;margin-top:12px;font-size:14px}.reopen-settlement{position:absolute;left:50%;top:45%;transform:translateX(-50%);z-index:5}.portrait .settlement-money{grid-template-columns:repeat(2,1fr);gap:12px}.portrait .settlement-versus b{font-size:40px}

/* Broadcast-style mirrored scores: name \xB7 points | wins (frames) wins | points \xB7 name. */
.scoreboard-main,.portrait .scoreboard-main{grid-template-columns:minmax(0,1fr) 106px minmax(0,1fr);gap:4px}
.scoreboard-player.opponent,.portrait .scoreboard-player.opponent{flex-direction:row-reverse}
.scoreboard-player.opponent strong{text-align:right}.scoreboard-main .frame-tally{height:44px;gap:9px;font-size:16px;border-left:1px solid #aaa;border-right:1px solid #aaa;white-space:nowrap}
.portrait .scoreboard-main{grid-template-columns:minmax(0,1fr) 76px minmax(0,1fr);gap:2px}.portrait .scoreboard-main .frame-tally{font-size:13px;gap:5px}.portrait .scoreboard-player,.portrait .scoreboard-player.opponent{gap:3px;padding:4px 2px}.portrait .scoreboard-player strong{font-size:13px}.portrait .scoreboard-player .avatar{width:22px;height:22px}.portrait .turn-arrow{font-size:13px}.portrait .player-clock{font-size:12px}

.match-found-center{inset:0;gap:22px}.match-found-pair{display:grid;grid-template-columns:minmax(140px,1fr) 64px minmax(140px,1fr);align-items:center;gap:24px;width:72%;max-width:680px}.match-found-person{display:flex;flex-direction:column;align-items:center;gap:12px;text-align:center}.match-found-person>.avatar{width:76px;height:76px;font-size:28px}.match-found-person>strong{font-size:24px;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.match-found-vs{text-align:center;font-size:32px}.portrait .match-found-pair{width:90%;grid-template-columns:minmax(0,1fr) 44px minmax(0,1fr);gap:12px}.portrait .match-found-person>strong{font-size:20px}

/* Three independent scoreboard components; the center owns every score. */
.scoreboard-main,.portrait .scoreboard-main{grid-template-columns:minmax(0,1fr) 244px minmax(0,1fr);gap:0}.scoreboard-player,.portrait .scoreboard-player{gap:5px;padding:4px}.scoreboard-identity{display:flex;align-items:center;gap:7px;flex:1;min-width:0;height:40px;padding:3px 5px!important;background:transparent!important;border:0!important}.scoreboard-identity strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:left}.opponent .scoreboard-identity{flex-direction:row-reverse}.opponent .scoreboard-identity strong{text-align:right}#screen .central-score{display:grid;grid-template-columns:15px 48px 1fr 48px 15px;align-items:center;gap:0;padding:0;height:44px;border:1px solid #999;border-radius:0;background:#fafafa}.central-score .frame-tally{border:0;border-left:1px solid #aaa;border-right:1px solid #aaa;gap:7px;font-size:16px;height:42px}.central-score .frame-points{font-size:26px;margin:0;min-width:0}.central-arrow{font-size:18px;line-height:1}.portrait .scoreboard-main{grid-template-columns:minmax(0,1fr) 190px minmax(0,1fr)}.portrait #screen .central-score{grid-template-columns:12px 35px 1fr 35px 12px}.portrait .central-score .frame-tally{font-size:12px;gap:4px}.portrait .central-score .frame-points{font-size:22px}.portrait .central-arrow{font-size:14px}.portrait .scoreboard-identity{gap:3px;padding:2px!important}.portrait .scoreboard-player{gap:2px}.portrait .scoreboard-identity strong{font-size:12px}.portrait .player-clock{font-size:11px}
.match-stat-head,.match-stat-comparison>div{display:grid;grid-template-columns:1fr 150px 1fr;gap:10px;align-items:center;text-align:center}.match-stat-head>span{display:flex;flex-direction:column;align-items:center;gap:6px}.match-stat-head .avatar{width:44px;height:44px}.match-stat-comparison{margin-top:16px}.match-stat-comparison>div{padding:12px 5px;border-bottom:1px solid #ccc}.match-stat-comparison>div:nth-child(odd){background:#eee}#overlay[data-drawer=match-stats] .dialog{width:620px}.portrait .match-stat-head,.portrait .match-stat-comparison>div{grid-template-columns:1fr 132px 1fr;font-size:14px}

/* Nonmodal shot decisions: only the actual buttons capture input. */
.table-decision{position:absolute;bottom:94px;left:50%;transform:translateX(-50%);width:max-content;max-width:calc(100% - 40px);z-index:5;pointer-events:none;text-align:center}.table-decision-caption{font-size:14px;margin-bottom:8px;display:inline-block;padding:3px 10px;background:#ffffffaa;border-radius:3px}.table-decision-buttons{display:flex;justify-content:center;flex-wrap:wrap;gap:8px;pointer-events:none}.table-decision-buttons>button{pointer-events:auto;min-width:76px;min-height:48px;padding:10px 14px;font-size:16px;background:#f5f5f5ef!important;border:1px solid #888!important}.portrait .table-decision{bottom:98px;max-width:calc(100% - 32px);width:400px}.portrait .table-decision-buttons>button{flex:0 0 calc(33.333% - 8px);min-width:0;min-height:52px}

#screen .central-score{grid-template-columns:48px minmax(0,1fr) 48px}.portrait #screen .central-score{grid-template-columns:35px minmax(0,1fr) 35px}.player-turn-arrow{font-size:18px;flex-shrink:0;line-height:1}.portrait .player-turn-arrow{font-size:14px}.scoreboard-player.current{border:1px solid #aaa;border-radius:0}

/* The three adjacent segments are the bar; no enclosing card or padding. */
#screen .duel-scoreboard{padding:0;border:0;border-radius:0;background:transparent;box-shadow:none}
#screen .scoreboard-main{gap:0;padding:0;border:0;background:transparent;align-items:stretch;height:48px}
#screen .scoreboard-main>.scoreboard-player,#screen .scoreboard-main>.central-score{height:48px;min-height:48px;margin:0;border:0;border-top:1px solid #999;border-bottom:1px solid #999;border-radius:0;box-shadow:none;background:#eeeeeedb;box-sizing:border-box}
#screen .scoreboard-main>.scoreboard-player{padding:0 8px}
#screen .scoreboard-main>.central-score{padding:0;border-left:1px solid #999;border-right:1px solid #999;background:#f8f8f8e8}
#screen .scoreboard-main>.scoreboard-player.current{background:#d9d9d9e8}
#screen .central-score .frame-tally{height:100%;align-self:stretch;border-radius:0}
#screen .central-score .frame-points{height:100%;display:flex;align-items:center;justify-content:center}
.portrait #screen .scoreboard-main>.scoreboard-player{padding:0 4px}

/* Attach the break strip directly to the active player's segment. */
#screen .floating-break{bottom:100%;left:-1px;right:-1px;height:28px;margin:0;border-radius:0;padding:2px 6px;display:flex;align-items:center;justify-content:space-between;gap:5px;border:1px solid #aaa;border-bottom:0;background:#f3f3f3e8;white-space:nowrap}.break-label{font-size:13px;flex-shrink:0}#screen .floating-break b{margin-left:3px}.break-ball-counts{display:flex;align-items:center;gap:3px}.break-ball{display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border:1px solid #777;border-radius:50%;background:var(--ball-color);color:#fff;font-size:11px;font-weight:700;line-height:1}.portrait #screen .floating-break{padding:2px 3px;gap:3px;height:26px}.portrait .break-label{font-size:11px}.portrait .break-ball-counts{gap:2px}.portrait .break-ball{width:13px;height:13px;font-size:9px}

/* Match the trial's painted disc rather than outlining its full touch canvas. */
#screen .existing-tip{border:0!important;background:transparent;border-radius:0}
#screen .existing-tip .practice-tip{border:0!important;background:transparent!important;border-radius:0;padding:0;min-height:0;box-shadow:none}
.tip-visible-disc{position:absolute;pointer-events:none;width:var(--tip-visible-size);height:var(--tip-visible-size);left:50%;top:50%;transform:translate(-50%,-50%);border:1.5px solid #8888;border-radius:50%;background:linear-gradient(transparent 49.7%,#8886 50%,transparent 50.3%),linear-gradient(90deg,transparent 49.7%,#8886 50%,transparent 50.3%),#ffffff2e}
#screen .observation-stick{padding:0;min-width:0;min-height:0;border:1px solid #8886;box-shadow:none;background:#ffffff1a}
.observation-stick>span{width:66%;height:66%;left:calc(17% + var(--pad-x,0%));top:calc(17% + var(--pad-y,0%));background:#ffffff33;border-color:#8888}
/* Single compact translucent top rail, shared by both orientations. */
#screen .online-game-top{height:48px;min-height:48px;padding:3px 8px;gap:7px;background:rgba(240,240,240,.48);border-bottom:1px solid #9994}
#screen .online-game-top .game-menu>summary{width:40px;height:40px}
#screen .online-game-top .online-game-actions>button{height:40px;min-height:40px;padding:5px 8px;background:#ffffff44}
#screen .online-game-top .match-quick-chat>summary{height:40px;display:flex;align-items:center;padding:5px 9px;background:#ffffff44}
#screen .online-game-top .fullscreen-button{width:40px;height:40px;min-height:40px}
#screen .online-game-top .network-control .network{width:32px;height:32px;min-height:32px;padding:5px}
#screen .online-game-top .match-quick-chat>div{top:44px}

.settlement-versus{display:grid;grid-template-columns:1fr 36px 1fr;grid-template-rows:auto auto;gap:8px 12px;align-items:center}.settlement-versus .result-left{grid-column:1;grid-row:1}.settlement-versus .result-right{grid-column:3;grid-row:1}.result-score-left{grid-column:1;grid-row:2}.result-score-right{grid-column:3;grid-row:2}.settlement-versus .versus-colon{grid-column:2;grid-row:2;align-self:center;line-height:1}.settlement-versus>b{font-size:44px;line-height:1.15}#overlay[data-drawer=frame-result] .dialog-footer{border:0;padding:10px 18px 18px}#overlay[data-drawer=frame-result] .settlement-next{margin:0}
.replay-frame-picker{position:absolute;top:10px;left:70px;z-index:7}.replay-frame-picker>summary{list-style:none;cursor:pointer;border:1px solid #999;background:#ffffff88;border-radius:4px;padding:9px 12px;min-height:40px}.replay-frame-picker>div{display:grid;grid-template-columns:repeat(3,1fr);gap:5px;background:#eee;border:1px solid #999;padding:8px;position:absolute;top:46px;left:0;width:260px;max-height:300px;overflow:auto}.replay-frame-picker button{min-height:44px;padding:5px}

.coin-sources-hint{font-size:12px;line-height:1.6;color:#666;margin-top:14px}

/* Dialogs read as one surface, without header/footer rules. */
#overlay .dialog-head,#overlay .dialog-footer{border:0;box-shadow:none}
.ranked-versus{grid-template-columns:minmax(0,1fr) 100px minmax(0,1fr);padding-top:12px}.ranked-versus .settlement-verdict{grid-column:2;grid-row:1;align-self:center;font-size:34px;white-space:nowrap;text-align:center}.portrait .ranked-versus{grid-template-columns:minmax(0,1fr) 82px minmax(0,1fr)}.portrait .ranked-versus .settlement-verdict{font-size:30px}

.settlement-earnings{display:flex;flex-direction:column;align-items:center;gap:6px;padding:16px 0 8px;text-align:center}.settlement-earnings>small{font-size:13px;color:#666}.settlement-earnings-total{font-size:38px;font-weight:700;line-height:1.2}.settlement-earnings-total .coin-icon{width:28px;height:28px}.settlement-earnings>p{display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:5px;font-size:12px;color:#666}.settlement-earnings>p svg{width:14px;height:14px}

/* Game-style close control for optional panels only. */
#overlay .corner-dismissible{position:relative;max-width:calc(100% - 32px);max-height:calc(100% - 32px)}
#overlay .corner-dismissible>.dialog-head{padding-right:60px}
#screen #overlay .game-dialog-close{position:absolute;right:-22px;top:-22px;width:44px;height:44px;min-height:44px;padding:0;border:2px solid #777;border-radius:50%;background:#f4f4f4;color:#333;font:700 34px/36px system-ui;display:flex;align-items:center;justify-content:center;box-shadow:0 1px 3px #0003;z-index:5}
#screen #overlay .game-dialog-close:hover{background:#ddd}#screen #overlay .game-dialog-close:focus-visible{outline:3px solid #555;outline-offset:2px}
#overlay:is([data-drawer=player],[data-drawer=duel-profile]) .corner-dismissible>.dialog-head{padding-right:60px}.portrait #overlay:is([data-drawer=player],[data-drawer=duel-profile]) .profile-identity{gap:4px}.portrait #overlay:is([data-drawer=player],[data-drawer=duel-profile]) .profile-relationship-actions{gap:4px}.portrait #overlay:is([data-drawer=player],[data-drawer=duel-profile]) .profile-relationship-actions button{padding:7px 6px;font-size:12px}

/* The close button straddles the panel corner; keep its full touch target visible. */
#overlay .corner-dismissible{overflow:visible;max-width:calc(100% - 48px);max-height:calc(100% - 48px)}
#screen .table-decision-buttons.color-ball-buttons>button{width:56px;min-width:56px;height:56px;min-height:56px;padding:8px;display:flex;align-items:center;justify-content:center;flex:0 0 56px}
.nomination-ball{display:block;width:36px;height:36px;border-radius:50%;background:radial-gradient(ellipse at 32% 22%,#fff 0%,#ffffffed 4%,#ffffff80 9%,transparent 20%),radial-gradient(circle at 37% 30%,var(--sphere-light) 0%,var(--sphere-color) 48%,var(--sphere-dark) 88%);box-shadow:inset -2px -3px 4px #0005,0 3px 3px #0004}
.ball-yellow{--sphere-light:#fff599;--sphere-color:#eac800;--sphere-dark:#756300}.ball-green{--sphere-light:#70d989;--sphere-color:#13863a;--sphere-dark:#06381b}.ball-brown{--sphere-light:#b78353;--sphere-color:#764222;--sphere-dark:#30180e}.ball-blue{--sphere-light:#6faaff;--sphere-color:#165ccb;--sphere-dark:#082659}.ball-pink{--sphere-light:#ffd5e3;--sphere-color:#e98cab;--sphere-dark:#88445d}.ball-black{--sphere-light:#747982;--sphere-color:#25272b;--sphere-dark:#050608}

.table-system-message{font-size:14px;line-height:1.25;font-weight:500;white-space:normal;overflow-wrap:anywhere;max-width:100%}.online-game-status:has(.table-system-message){min-width:0;flex:1}.portrait .table-system-message{font-size:12px}
/* Scores remain fixed; notices occupy their own following area. */

.online-game-top>.table-system-message{flex:1 1 0;min-width:0;max-height:40px;overflow:auto;text-align:left;scrollbar-width:none}
.online-game-top>.table-system-message::-webkit-scrollbar{display:none}
.online-game-top .online-game-actions{flex-shrink:0}



/* Lobby navigation is one continuous bar with inset separators. */
#screen .topbar{gap:0;padding:0 10px;align-items:stretch}
#screen .topbar>button,#screen .topbar>.network-control{position:relative;height:100%;min-height:0;margin:0;border:0;border-radius:0;background:transparent;box-shadow:none;display:flex;align-items:center;justify-content:center}
#screen .topbar>button{padding:0 10px}
#screen .topbar>:not(:first-child)::before{content:'';position:absolute;left:0;top:14px;bottom:14px;width:1px;background:#d4d4d4;pointer-events:none}
#screen .topbar>.network-control{flex:0 0 48px}
#screen .topbar .network-control>.network{width:100%;height:100%;min-height:0;border:0;border-radius:0;background:transparent;padding:10px}
#screen .topbar>.fullscreen-button{flex:0 0 48px;width:48px}
#screen .topbar>button:hover,#screen .topbar .network-control>.network:hover{background:#00000006}
#screen .topbar>button:focus-visible,#screen .topbar .network-control>.network:focus-visible{outline:2px solid #777;outline-offset:-4px}
.portrait #screen .topbar{padding:0 4px;gap:0}
.portrait #screen .topbar>button{padding:0 4px}
.portrait #screen .topbar>.network-control,.portrait #screen .topbar>.fullscreen-button{flex-basis:36px;width:36px}
.message-count{display:inline-flex;align-items:center;justify-content:center;min-width:18px;height:18px;margin-left:5px;padding:0 4px;border-radius:10px;background:#666;color:#fff;font-size:11px;line-height:1}
#screen .home .roster,.portrait #screen .home .roster{right:0;top:0;bottom:0;border-right:0;border-radius:0;margin:0}
#overlay:is([data-drawer=online],[data-drawer=online-empty],[data-drawer=invite-player]){padding:0;justify-content:flex-end}
#overlay:is([data-drawer=online],[data-drawer=online-empty],[data-drawer=invite-player]) .chat-panel{position:absolute;right:0;left:auto;top:0;bottom:0;height:100%;max-height:100%;margin:0;border-radius:0;border-right:0}
.opening-rules{max-width:85%;text-align:center;font-size:16px;line-height:1.5}
.replay-rail{position:absolute;right:8px;top:62px;bottom:64px;z-index:8;width:106px;display:flex;flex-direction:column;gap:6px;justify-content:center;overflow:visible}
#screen .replay-rail>button,.replay-rail summary{width:100%;min-height:36px;background:#f5f5f5cf;border:1px solid #aaa;border-radius:4px;font-size:13px;padding:7px 5px;text-align:center;cursor:pointer;list-style:none}
.replay-rail details{position:relative;flex-shrink:0}.replay-rail details>div{position:absolute;right:calc(100% + 8px);left:auto;top:0;width:180px;background:#eee;border:1px solid #aaa;padding:6px;display:grid;grid-template-columns:repeat(2,1fr);gap:5px;max-height:300px;overflow:auto}
.replay-rail .replay-frame-picker{position:relative;top:auto;left:auto;z-index:auto}.replay-position{text-align:center;font-size:12px;padding:3px;background:#ffffff80;white-space:nowrap}.replay-training-stat{position:absolute;bottom:12px;left:24px;background:#ffffff88;padding:8px 12px}
.portrait .replay-rail{top:70px;bottom:74px;width:100px;gap:9px}.portrait #screen .replay-rail>button,.portrait .replay-rail summary{min-height:44px;font-size:14px}

/* Compact replay controls; view choices only appear after opening their trigger. */
#screen .replay-rail{width:44px;right:10px;gap:6px;align-items:center}
#screen .replay-rail>button,#screen .replay-rail summary{width:44px;height:44px;min-height:44px;padding:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;border-radius:5px}
#screen .replay-rail svg{width:24px;height:24px;flex-shrink:0}
#screen .replay-rail .replay-frame-picker summary{padding:3px;font-size:11px;white-space:normal;text-align:center;line-height:1.3}
#screen .replay-rail details:not([open])>div{display:none}
#screen .replay-rail details[open]>div{display:grid}
#screen .replay-rail summary::-webkit-details-marker{display:none}
.board-layout{height:100%;min-height:0;display:flex;flex-direction:column;gap:14px}
.board-segments{display:flex;flex-shrink:0;gap:0;min-width:0}
#screen .board-segments>button{flex:1;min-width:0;min-height:44px;padding:8px 10px;border:1px solid #aaa;border-radius:0;background:#f7f7f7;white-space:nowrap}
#screen .board-segments>button+button{border-left:0}
#screen .board-segments>button:first-child{border-radius:5px 0 0 5px}
#screen .board-segments>button:last-child{border-radius:0 5px 5px 0}
#screen .board-segments>button.active{background:#d2d2d2;font-weight:700}
.board-filters{display:flex;gap:20px;flex-shrink:0}.board-filters>.board-segments{flex:1}.board-season{flex-shrink:0}
.board-scroll{flex:1;min-height:0;overflow:auto;overscroll-behavior:contain}
.board-table{table-layout:fixed;width:100%;margin:0}.board-table th{position:sticky;top:0;background:#e9e9e9;z-index:1;white-space:nowrap}.board-table th:first-child{width:64px}.board-table td{height:48px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#screen .board-player{display:block;max-width:100%;min-height:40px;border:0;background:transparent;padding:6px 0;text-align:left;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:inherit}
.board-end{text-align:center;color:#777;padding:12px;font-size:12px;min-height:24px}
.portrait .board-layout{gap:12px}.portrait .board-filters{flex-direction:column;gap:10px}.portrait #screen .board-segments>button{font-size:14px;padding:8px 4px;min-height:46px}
.portrait .board-table th,.portrait .board-table td{padding:8px 4px;font-size:12px}.portrait .board-table th:first-child{width:42px}
/* Medal/trophy colors convey award type; the cabinet remains a wireframe. */
.medal-1,.trophy-gold{--medal-fill:#e6cb79;--medal-edge:#9d823b;--medal-ribbon:#d5bc83;--cup-fill:#e6cb79;--cup-edge:#9d823b}
.medal-2,.trophy-silver{--medal-fill:#d6dce0;--medal-edge:#828b92;--medal-ribbon:#c1c7cc;--cup-fill:#d6dce0;--cup-edge:#828b92}
.medal-3,.trophy-bronze{--medal-fill:#cfa586;--medal-edge:#95694e;--medal-ribbon:#bea08b;--cup-fill:#cfa586;--cup-edge:#95694e}
.trophy-break{--cup-fill:#e7e7e7;--cup-edge:#767676}
.rank-medal{display:inline-flex;vertical-align:middle;width:32px;height:35px}.rank-medal svg{width:100%;height:100%}
.profile-header-identity{display:flex;align-items:center;gap:12px;min-width:0;font-size:22px}.profile-header-identity>.avatar{width:40px;height:40px;flex-shrink:0;margin:0}.profile-header-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.profile-header-identity .level-badge{flex-shrink:0}
#screen .page-header:has(.profile-header-identity) h1{min-width:0}
#screen .profile-level-progress{display:inline-flex;align-items:center;gap:7px;flex:none}
#screen .profile-level-meter{display:flex;align-items:center;gap:7px;min-width:0;font-size:10px;font-weight:500;line-height:12px;color:#b3bfcc;white-space:nowrap;font-variant-numeric:tabular-nums}
#screen .profile-level-meter progress{display:block;width:110px;height:12px;accent-color:#3cba76}
#screen .page-header .profile-level-help{display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;min-width:32px;min-height:32px;margin:0;padding:0;border:0;background:transparent;color:#b3bfcc;font-size:14px;font-weight:700;line-height:1}
#screen .profile-level-help::before{content:'?';display:grid;place-items:center;width:17px;height:17px;border:1px solid currentColor;border-radius:50%}
#screen .profile-level-help{font-size:0!important}
#screen .profile-level-help::before{font-size:12px}
#screen.portrait .profile-level-meter progress{width:86px}
.honor-cabinet{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));border:2px solid #aaa;background:#e8e8e8;box-shadow:inset 0 6px 12px #0000000c;padding:14px 12px 0;gap:0}
.honor-display{position:relative;display:flex;flex-direction:column;align-items:center;text-align:center;min-width:0;padding:12px 6px 20px;border-bottom:9px solid #b9b9b9;margin-bottom:18px;box-shadow:0 4px 0 #d1d1d1;gap:5px}
.honor-trophy{width:106px;height:106px;flex-shrink:0}.honor-display strong{font-size:14px}.honor-display>span{font-size:12px;color:#555}.honor-display>time{font-size:11px;color:#777}
.portrait .honor-cabinet{grid-template-columns:repeat(2,minmax(0,1fr));padding:8px 4px 0}.portrait .honor-display{padding:10px 3px 16px}.portrait .honor-trophy{width:90px;height:90px}.portrait .honor-display strong{font-size:12px}.portrait .honor-display>span{font-size:11px}.portrait .profile-header-identity{gap:8px;font-size:20px}
/* Profile navigation stays in place while the selected panel scrolls. */
#screen .page-content:has(>.profile-layout){overflow:hidden;display:flex;flex-direction:column}
#screen .profile-layout{height:100%;min-height:0;flex:1;overflow:hidden}
#screen .profile-layout>.profile-tabs{min-height:0;overflow:auto;align-self:stretch}
#screen .profile-layout>.profile-panel{min-height:0;overflow:auto;overscroll-behavior:contain;padding-bottom:8px}
#screen .honor-cabinet{grid-template-columns:repeat(4,minmax(0,1fr))}
.portrait #screen .honor-cabinet{grid-template-columns:repeat(3,minmax(0,1fr))}
.portrait #screen .honor-trophy{width:70px;height:70px}
.portrait #screen .honor-display{padding-left:2px;padding-right:2px}
.portrait #screen .honor-display>span{line-height:1.4;overflow-wrap:anywhere}
/* Filters stay with their headers; only lists scroll. */
.message-header-filters{display:flex;margin:0;gap:0;flex:1;justify-content:center}.message-header-filters button{min-height:44px;min-width:0;border-radius:0}.message-header-filters button+button{border-left:0}.message-header-filters button:first-child{border-radius:4px 0 0 4px}.message-header-filters button:last-child{border-radius:0 4px 4px 0}
.page-header:has(.message-header-filters) h1{flex:0 0 auto}.portrait .page-header:has(.message-header-filters){flex-wrap:wrap;gap:8px}.portrait .message-header-filters{order:3;flex:0 0 100%;justify-content:stretch}.portrait .message-header-filters button{flex:1}
#overlay:is([data-drawer=online],[data-drawer=online-empty],[data-drawer=invite-player]) .chat-panel{overflow:visible}
#overlay:is([data-drawer=online],[data-drawer=online-empty],[data-drawer=invite-player]) .dialog-head{height:auto;min-height:54px;padding:6px 10px;flex-shrink:0;gap:8px}
#overlay .dialog-head>.social-tabs{margin:0;flex:1;min-width:0}
#overlay .dialog-head>.social-tabs button{padding:8px 5px;font-size:13px;white-space:nowrap;min-height:40px}
#overlay .dialog-head>.copy-invite-button{padding:8px 6px;font-size:12px;min-height:40px}
#screen #overlay .drawer-edge-collapse{position:absolute;left:-24px;top:50%;transform:translateY(-50%);width:32px;height:64px;padding:0;border:1px solid #aaa;border-radius:8px 0 0 8px;background:#eee;font-size:30px;z-index:10}
#screen .replay-rail{width:56px;top:52px;bottom:54px;gap:3px;overflow-y:auto;overflow-x:visible;justify-content:flex-start;scrollbar-width:none}
#screen .replay-rail>button,#screen .replay-rail summary{width:48px;height:40px;min-height:40px;padding:6px;font-size:13px}
#screen .replay-rail>.replay-view.active{background:#cfcfcfe6;border-color:#666}
.portrait #screen .replay-rail{top:62px;bottom:65px;gap:6px;justify-content:center}.portrait #screen .replay-rail>button,.portrait #screen .replay-rail summary{height:44px;min-height:44px}
#screen .replay-rail{overflow:visible}

/* Trial-style top notice: slide down, brief hold, then retreat upwards. */
#toast{top:12px;bottom:auto;left:50%;width:max-content;max-width:calc(100% - 100px);padding:10px 20px;min-height:40px;border:1px solid #777;border-radius:6px;background:#333e;color:#fff;box-shadow:0 3px 10px #0002;font-size:14px;line-height:1.4;pointer-events:none;z-index:40}
#toast.toast-show{animation:top-toast-notice 3000ms both}
@keyframes top-toast-notice{0%{opacity:0;transform:translate(-50%,-28px)}9.333%{opacity:1;transform:translate(-50%,0);animation-timing-function:linear}90%{opacity:1;transform:translate(-50%,0)}100%{opacity:0;transform:translate(-50%,-24px)}}
#toast.toast-show{animation-timing-function:cubic-bezier(.22,.61,.36,1)}
@media(prefers-reduced-motion:reduce){#toast.toast-show{animation:none}}

/* Keep a clear safety gap between permanent scores and transient match messages. */
.online-game-top>.table-system-message{margin-left:20px}
.portrait .online-game-top>.table-system-message{margin-left:14px}

/* Both in-table decisions share one compact frame without blocking table gestures. */
#screen .table-decision{box-sizing:border-box;width:340px;max-width:calc(100% - 32px);height:100px;padding:10px;border:1px solid #999;border-radius:6px;background:#eeeeeedb;pointer-events:none}
#screen .table-decision-caption{display:block;height:20px;line-height:20px;margin:0 0 8px;padding:0;background:transparent;border-radius:0;font-size:14px}
#screen .table-decision-buttons{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}
#screen .table-decision-buttons.color-ball-buttons{grid-template-columns:repeat(6,minmax(0,1fr))}
#screen .table-decision-buttons>button,#screen .table-decision-buttons.color-ball-buttons>button{box-sizing:border-box;width:100%;min-width:0;height:48px;min-height:48px;padding:5px;font-size:14px;display:flex;align-items:center;justify-content:center;pointer-events:auto}
#screen .table-decision .nomination-ball{width:28px;height:28px;flex-shrink:0}

#screen .page-header .page-back-icon{width:44px;height:44px;min-width:44px;min-height:44px;flex:0 0 44px;padding:10px;display:flex;align-items:center;justify-content:center}
.page-back-icon svg{width:24px;height:24px}
.board-season>select{margin:0;min-height:44px}

/* Timeout fouls offer two equally sized choices in the existing decision frame. */
#screen .table-decision-buttons.timeout-foul-buttons{grid-template-columns:repeat(2,minmax(0,1fr))}

/* Pinned self ranking uses the same column widths as the scrollable list. */
.board-own{flex:0 0 auto;background:#e5e5e5;border-top:1px solid #aaa}
.board-own .board-table td{height:48px;border-bottom:0;font-weight:600}
.board-layout>.empty{flex:1;min-height:0}
.season-trophies{display:flex;justify-content:center;gap:40px;margin:12px 0}
.season-trophies>div{display:flex;flex-direction:column;align-items:center;gap:4px}
.season-trophies .honor-trophy{width:76px;height:76px}
.room-full-state{height:100%;display:flex;flex-direction:column;justify-content:center;align-items:center;gap:20px}
.room-full-state h2,.room-full-state p{margin:0}
.room-full-players{display:flex;align-items:center;justify-content:center;gap:48px}
.room-full-players>div{display:flex;flex-direction:column;align-items:center;gap:12px}
.room-full-players .avatar{width:64px;height:64px;font-size:26px}
.room-full-state .actions{justify-content:center}

/* Equipment catalogue: elongated cue/case rows; compact accessories remain three columns. */
.gear-content{min-height:0;overflow-y:auto;padding-right:4px}.gear-tier{margin-bottom:22px}.gear-tier h2{font-size:18px;margin:0 0 10px}
#screen .gear-grid{grid-template-columns:repeat(3,minmax(0,1fr))}
#screen .gear-long-grid{grid-template-columns:minmax(0,1fr)}
.gear-art{width:100%;height:80px;display:block}.gear-overview-item .gear-art{height:42px}
#screen .gear-card .gear-preview{border:0;background:transparent;min-height:0;gap:6px}
#screen .gear-long-grid .gear-card{display:grid;grid-template-columns:minmax(0,1fr) 92px 90px;gap:14px;padding:12px 16px}
.gear-long-grid .gear-preview strong{align-self:flex-start}.gear-long-grid .gear-art{height:52px}
#screen.portrait .gear-grid{gap:8px}#screen.portrait .gear-card{padding:10px 5px;gap:10px}#screen.portrait .gear-card strong{font-size:12px;line-height:1.5;overflow-wrap:anywhere}
#screen.portrait .gear-long-grid .gear-card{grid-template-columns:minmax(0,1fr) 64px 62px;gap:8px;padding:10px}
#screen.portrait .gear-card>button:not(.gear-preview){padding:6px;min-height:44px;font-size:13px}
.gear-detail-price{text-align:center;margin:12px}.gear-detail-art .gear-art{height:120px}

.gear-just-upgraded{outline:3px solid #666;outline-offset:2px}

.gear-properties{display:flex;flex-direction:column;gap:12px;margin:16px 0;padding:14px 18px;background:#ededed;border-radius:6px}
.gear-properties>div{display:flex;align-items:center;justify-content:space-between;gap:18px}
.gear-properties b{white-space:nowrap;font-size:20px}.gear-properties small{font-size:12px;color:#666}
.gear-summary{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:16px}.gear-summary h2{margin:0}.gear-summary>div{text-align:right}.gear-summary b{font-size:22px}.gear-summary small{display:block;color:#666;font-size:12px}
#screen .dialog-body:has(.gear-properties) .gear-detail-art{height:100px}

/* Keep upgrade and equip actions visible without opening item details. */
.gear-card-actions{display:flex;flex-direction:column;gap:8px;width:100%;margin-top:auto}
#screen .gear-card-actions>button{width:100%;min-height:44px;padding:7px 8px;white-space:nowrap;font-size:14px}
#screen .gear-long-grid .gear-card{grid-template-columns:minmax(0,1fr) 82px 176px}
.gear-long-grid .gear-card-actions{flex-direction:row;margin-top:0;align-items:center}
.gear-long-grid .gear-card-actions>button{flex:1;min-width:0}
#screen.portrait .gear-long-grid .gear-card{grid-template-columns:minmax(0,1fr) 64px 74px}
.portrait .gear-long-grid .gear-card-actions{flex-direction:column}
#screen.portrait .gear-card-actions>button{font-size:13px;padding:7px 3px}

/* Current equipment grade follows its name; no grade section headings. */
.gear-name-line{display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:5px;min-width:0}
.gear-long-grid .gear-name-line{align-self:stretch;justify-content:flex-start}
#screen .gear-tier-tag{display:inline-flex;align-items:center;flex-shrink:0;font-size:11px;line-height:1.4;padding:2px 5px;border:1px solid #aaa;border-radius:3px;background:#e9e9e9;color:#555;white-space:nowrap}

/* Ferrule and extension actions share one row in both orientations. */
#screen .gear-inline-actions .gear-card-actions{display:flex;flex-direction:row;gap:4px;align-items:stretch}
#screen .gear-inline-actions .gear-card-actions>button{flex:1 1 0;width:0;min-width:0;padding:7px 2px;font-size:13px;min-height:44px}
#screen.portrait .gear-inline-actions .gear-card-actions>button{font-size:11px;padding:7px 1px}

#screen .gear-card.gear-equipped,#screen .gear-overview-item.gear-equipped{border:1px solid #555;box-shadow:inset 0 0 0 2px #555;background:#f3f3f3}
.gear-card-property{font-size:12px;color:#555;line-height:1.5}.gear-card-property b{color:#222}
.gear-long-grid .gear-card-property{align-self:flex-start}

.gear-description{font-size:14px;line-height:1.6;color:#555;margin:10px 0 14px;text-align:left}

#overlay:is([data-drawer=player],[data-drawer=duel-profile]) .dialog-body{display:flex;flex-direction:column;min-height:0;overflow:hidden}
.player-profile-tabs{display:flex;flex-shrink:0;margin:0 0 12px}
#screen .player-profile-tabs>button{flex:1;min-height:44px;border:1px solid #aaa;border-radius:0;background:#f5f5f5}
#screen .player-profile-tabs>button+button{border-left:0}
#screen .player-profile-tabs>button.active{background:#d5d5d5;font-weight:700}
.player-tab-content{min-height:0;overflow:auto;max-height:310px;overscroll-behavior:contain}
#screen.portrait .player-tab-content{max-height:610px}
.player-honors-empty{display:grid;place-items:center;min-height:220px;color:#666}
#screen .player-tab-content .honor-cabinet{grid-template-columns:repeat(4,minmax(0,1fr))}
#screen.portrait .player-tab-content .honor-cabinet{grid-template-columns:repeat(3,minmax(0,1fr))}
#screen .player-tab-content .honor-trophy{width:70px;height:70px}

/* Side navigation is a continuous rail with inset dividers. */
#screen :is(.gear-categories,.profile-tabs){gap:0;padding:0;background:#f3f3f3}
#screen :is(.gear-categories,.profile-tabs)>button{position:relative;flex-shrink:0;width:100%;min-height:48px;margin:0;padding:12px;border:0;border-radius:0;box-shadow:none;background:transparent;text-align:left}
#screen :is(.gear-categories,.profile-tabs)>button+button::before{content:"";position:absolute;top:0;left:12px;right:12px;height:1px;background:#ccc;pointer-events:none}
#screen :is(.gear-categories,.profile-tabs)>button:hover{background:#e9e9e9}
#screen :is(.gear-categories,.profile-tabs)>button.active{background:#ddd;font-weight:700}
#screen :is(.gear-categories,.profile-tabs)>button:focus-visible{outline:2px solid #666;outline-offset:-3px}

/* Shared visual foundation. Logical canvas is half the documented design size. */
#screen{--ui-text:#f6f8fc;--ui-muted:#b3bfcc;--ui-panel:#151b22;--ui-border:#ffffff30;--ui-primary:#168449;--ui-success:#48cf76;--ui-error:#ff6975}
.ui-icon{display:inline-block;width:24px;height:24px;flex-shrink:0;background:currentColor;mask:var(--icon) center/contain no-repeat;-webkit-mask:var(--icon) center/contain no-repeat;vertical-align:middle}
#screen .design-page{height:100%;min-height:0;background:#10151b;color:var(--ui-text);display:flex;flex-direction:column}
.design-scroll{overflow:auto;padding:30px 40px;scrollbar-color:#56616d #10151b}
.design-heading{margin-bottom:24px}.design-heading small{color:#78c998;letter-spacing:2px;font-size:10px}.design-heading h1{font-size:30px;margin:8px 0}.design-heading p,.design-section p{color:#b3bfcc;line-height:1.8;margin:8px 0;font-size:14px}
.design-cover{display:grid;grid-template-columns:1.7fr 1fr;gap:22px;align-items:center}.design-cover>img{width:100%;border-radius:8px;border:1px solid #ffffff30}.design-cover h2{font-size:20px;margin:12px 0}.design-cover p{color:#b3bfcc;font-size:13px}.design-status{font-size:11px;color:#70d896}.design-section{margin-top:28px}.design-section h2{font-size:18px;margin-bottom:12px}.design-grid{display:grid;gap:12px}.design-grid.three{grid-template-columns:repeat(3,1fr)}.design-grid.two{grid-template-columns:1fr 1fr}.design-grid article{border:1px solid #ffffff22;border-radius:8px;padding:16px;background:#ffffff05}.design-grid article b{font-size:14px}.design-grid article p{font-size:12px}.design-next{display:flex;gap:8px;flex-wrap:wrap;padding-top:28px;margin-top:20px;border-top:1px solid #ffffff18}
#screen .design-page button,#screen[data-view^="design-"] .dialog button{background:#ffffff0d;border:1px solid #ffffff30;color:#f6f8fc;border-radius:6px;min-height:44px}#screen .design-page button:hover,#screen[data-view^="design-"] .dialog button:hover{background:#ffffff20}#screen .design-page button.primary,#screen[data-view^="design-"] .dialog button.primary,#screen .design-page button.active{background:#168449;border-color:#49ad76;color:#fff}#screen .design-page button.danger{color:#ff6975;border:1px solid #ff697570}#screen .design-page button:focus-visible{outline:2px solid #9ae8b6}
.design-swatches{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.design-swatches article{display:grid;gap:6px}.design-swatches article>span{height:80px;border:1px solid #ffffff30;border-radius:8px}.design-swatches code,.design-semantic code{color:#b3bfcc;font-size:12px}.design-semantic{display:flex;flex-wrap:wrap;gap:20px;margin-top:20px;font-size:12px}.design-semantic span{display:flex;align-items:center;gap:7px}.design-semantic i{width:16px;height:16px;border-radius:50%}.design-type{display:grid;gap:12px}.design-type small{font-size:13px;color:#b3bfcc}.design-opacity{background:linear-gradient(#0008,#0008),url('/assets/lobby-background.png') center/cover!important}.design-opacity.light{background:linear-gradient(#0008,#0008),url('/assets/lobby-background.png') center/cover!important}
#screen .design-mode-samples{position:static;display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.design-mode-samples button{position:relative;overflow:hidden;height:105px;font-size:28px;font-weight:800;text-shadow:0 2px 3px #0008}#screen .design-mode-samples button:nth-child(1){background:linear-gradient(#25ae18,#087503)}#screen .design-mode-samples button:nth-child(2){background:linear-gradient(#1677d7,#06418f)}#screen .design-mode-samples button:nth-child(3){background:linear-gradient(#efa515,#b86500)}.mode-watermark{position:absolute;width:90px;height:90px;left:8px;top:5px;opacity:.12;pointer-events:none}
.design-button-samples{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px}#screen .design-segment{display:flex;gap:0;max-width:500px}#screen .design-segment button{flex:1;border-radius:0;margin-left:-1px}#screen .design-segment button:first-child{border-radius:6px 0 0 6px;margin-left:0}#screen .design-segment button:last-child{border-radius:0 6px 6px 0}#screen .design-page input{background:#090d12;border:1px solid #536173;color:#fff;border-radius:6px;min-height:44px}.design-page .error-text{color:#ff6975}.design-asset-row{display:flex;gap:24px;align-items:center}.design-asset-row>img{width:44%;border:1px solid #ffffff20;border-radius:8px}.design-asset-row>div{flex:1}.design-asset-row>img.design-avatar{width:100px;height:100px;border-radius:50%;object-fit:cover}.design-icon-row{display:flex;gap:28px;flex-wrap:wrap}.design-icon-row>span{display:grid;justify-items:center;gap:10px;font-size:12px}.design-icon-row .ui-icon{width:28px;height:28px}.design-section a{color:#88d8aa;font-size:12px}
#screen[data-view^="design-"] .dialog{background:rgba(21,27,34,.96);color:#f6f8fc;border:1px solid #65717b;border-radius:12px;box-shadow:0 15px 60px #0008}#screen[data-view^="design-"] .dialog small,#screen[data-view^="design-"] .dialog .muted{color:#b3bfcc}#screen[data-view^="design-"] .dialog input,#screen[data-view^="design-"] .dialog select,#screen[data-view^="design-"] .dialog textarea{background:#0b1016;color:#fff;border-color:#536173}#screen[data-view^="design-"] .dialog .error-text{color:#ff6975}
#screen.portrait .design-scroll{padding:26px 22px}#screen.portrait .design-cover{grid-template-columns:1fr}#screen.portrait .design-grid.three,#screen.portrait .design-grid.two{grid-template-columns:1fr}#screen.portrait .design-mode-samples{gap:8px}#screen.portrait .design-mode-samples button{font-size:21px;padding:6px}#screen.portrait .design-asset-row{flex-direction:column;align-items:start}#screen.portrait .design-asset-row>img{width:100%}

#screen .design-page .error-text{background:#ff697512;border:1px solid #ff697540;color:#ff6975;padding:8px;border-radius:6px}

/* High fidelity skin \u2014 business structure and all routing remain in app.js. */
#screen{color:#f6f8fc;background:#10151b;font-family:Inter,-apple-system,BlinkMacSystemFont,'PingFang SC','Microsoft YaHei',sans-serif;font-variant-numeric:tabular-nums}
#game{background:url('/assets/lobby-crucible-v11-camera150.webp') center/cover no-repeat;background-color:#10151b}
#screen button,#screen summary{transition:background-color .15s,border-color .15s,box-shadow .15s;touch-action:manipulation}
#screen button{background:#25303b;border:1px solid #ffffff30;border-radius:6px;color:#f6f8fc;box-shadow:inset 0 1px #ffffff0c;min-height:40px}
#screen button:hover{background:#354555;border-color:#ffffff60}#screen button:active:not([data-product-press="cancelled"]){box-shadow:inset 0 2px 6px #0006}#screen button:disabled{opacity:.42;box-shadow:none;cursor:default}#screen button:focus-visible,#screen summary:focus-visible,#screen input:focus-visible{outline:2px solid #9ae8b6;outline-offset:3px}
#screen button.primary,#screen button.active{background:#168449;border-color:#49ad76;color:#fff;box-shadow:inset 0 1px #ffffff24,0 3px 10px #0002}#screen button.primary:hover,#screen button.active:hover{background:#209957}
#screen button.danger{color:#ff929b;border:1px solid #ff697570;background:#4f232b}
#screen small,#screen .muted,#screen .caption,#screen .small-text,#screen .email-note{color:#b3bfcc}#screen input,#screen select,#screen textarea{background:#0d141b;border:1px solid #657080;color:#f6f8fc;border-radius:6px;min-height:40px;color-scheme:dark}#screen input::placeholder,#screen textarea::placeholder{color:#8995a3}#screen input[type=checkbox]{accent-color:#23995b;min-height:20px}#screen h1,#screen h2,#screen h3{letter-spacing:.02em}#screen a{color:#8cdbac}
#screen .page{background:#101720ef;padding:20px 30px;backdrop-filter:blur(14px)}#screen .page-header{margin-bottom:20px;min-height:42px}#screen .page-header h1{font-size:24px;font-weight:700}#screen .page-content{scrollbar-color:#536273 transparent}#screen .page-footer{border:0}#screen .page-header>button:first-child{min-width:42px;padding:8px;background:#ffffff0b}
#screen :is(.card,.result-panel,.device-card,.seat,.stat-row>div,.profile-stat-grid>div,.message-card,.gear-card,.challenge-item,.mail-preview){background:#1c2630;border:1px solid #ffffff22;border-radius:9px;box-shadow:0 3px 12px #0002}
#screen :is(.summary,.notice-bar,.tag,.rules span,.challenge-reward,.level-progress,.settlement-stat,.gear-properties){background:#ffffff09;border-color:#ffffff24;border-radius:7px;color:#f6f8fc}#screen .row{border-bottom-color:#ffffff13}#screen .error-text{background:#6a202c30;color:#ff909b;border:1px solid #ff69753b;border-radius:6px}#screen .error-text:empty{border:0;padding:0}#screen .empty{color:#d3dde9}#screen .empty p{color:#b3bfcc}#screen .spinner{border-color:#ffffff20;border-top-color:#54c584}#screen .wire{background:#192530;color:#c5d3e2;border-color:#586879}
#screen .table th{background:#202d39;color:#bdcbd9;border-color:#ffffff20}#screen .table td{border-color:#ffffff12}#screen .table tr.me,#screen .table .me{background:#1684492b}#screen .table tbody tr:hover{background:#ffffff06}#screen .board-end{color:#8e9eb0}#screen .board-own{background:#1b3b2b;border-color:#5c9070}
/* Compound controls own their skin; generic button chrome must not frame each segment. */
#screen :is(.room-choice,.settings-segment,.social-tabs,.board-segments,.player-profile-tabs){gap:0}
#screen :is(.room-choice,.settings-segment,.board-segments){background:#18232e;isolation:isolate}
#screen :is(.room-choice,.settings-segment,.social-tabs,.board-segments,.player-profile-tabs)>button{background:#18232e;border:0;margin:0;appearance:none;-webkit-appearance:none;color:#c6d2e0;border-radius:0;box-shadow:none}
#screen :is(.room-choice,.settings-segment)>button{flex:1 1 0;min-width:0;white-space:nowrap}
#screen :is(.room-choice,.settings-segment,.social-tabs,.board-segments,.player-profile-tabs)>button.active{background:#168449;border-color:#49ad76;color:#fff}#screen :is(.room-choice,.settings-segment,.social-tabs,.board-segments,.player-profile-tabs)>button:first-child{border-radius:6px 0 0 6px}#screen :is(.room-choice,.settings-segment,.social-tabs,.board-segments,.player-profile-tabs)>button:last-child{border-radius:0 6px 6px 0}
#screen :is(.gear-categories,.profile-tabs){border-color:#ffffff18;background:#080d1430}#screen :is(.gear-categories,.profile-tabs)>button{background:transparent;box-shadow:none;border-radius:0;color:#afc1d1}#screen :is(.gear-categories,.profile-tabs)>button+button::before{background:#ffffff1a}#screen :is(.gear-categories,.profile-tabs)>button.active{background:#24955726;box-shadow:inset 3px 0 #4fca86;color:#fff}#screen :is(.gear-categories,.profile-tabs)>button:hover{background:#ffffff0a}
#screen .avatar,#screen .social-avatar{overflow:hidden;background:#263545;border:1px solid #c0cbd177;color:#fff}#screen .avatar img,#screen .social-avatar img{width:100%;height:100%;object-fit:cover;display:block}#screen .profile-avatar img{border-radius:50%;object-fit:cover;width:100%;height:100%}#screen .level-badge{color:#83dbab;background:#173c2b;border-color:#39835c}#screen .level-progress progress{accent-color:#3cba76}#screen .message-count{background:#df3949;color:#fff;box-shadow:0 1px 4px #0005}#screen .profile-stat-grid>div>b{font-size:26px;color:#f2f7ff}#screen .match-stat b{color:#8ad9af}#screen .message-copy p,#screen .message-card small{color:#b3bfcc}
/* Continuous lobby navigation, translucent neutral black surfaces. */
#screen .topbar{height:48px;min-height:48px;padding:0;background:#0006;border:0;border-bottom:1px solid #ffffff28;backdrop-filter:blur(8px);gap:0;z-index:2}
#screen .topbar>button,#screen .topbar>.network-control{background:transparent;border:0;border-radius:0;box-shadow:none;min-height:48px;font-size:16px;color:#f6f8fc;display:flex;justify-content:center;align-items:center;gap:8px}
#screen .topbar>:not(:first-child)::before{background:#ffffff38;top:11px;bottom:11px}#screen .topbar .identity{font-size:15px;gap:5px}#screen .topbar .avatar{width:34px;height:34px;margin-right:3px}#screen .topbar .level-badge{background:transparent;border:0;font-size:12px;padding:0}#screen .topbar .ui-icon{width:23px;height:23px}#screen .topbar>button:hover,#screen .topbar .network-control>.network:hover{background:#ffffff12}#screen .topbar .network-control>.network{background:transparent;color:#fff;box-shadow:none;border:0}#screen .signal-bars i{border-color:#ffffff38}#screen .signal-bars i.filled{background:#55cc7c;border-color:#55cc7c}
#screen .home{background:transparent}#screen .home .roster{position:absolute;right:0;left:auto;top:0;bottom:0;width:68px;height:auto;background:#0006;border:0;border-left:1px solid #ffffff28;border-radius:0;box-shadow:none;padding:15px 7px;justify-content:flex-start;gap:18px;backdrop-filter:blur(7px)}#screen .home .roster-title{color:#eff6ff;font-size:12px;background:transparent}#screen .home .roster-avatar{width:43px;height:43px;border-radius:50%;background:#263545;border:1px solid #dae7ee99;overflow:visible;position:relative}#screen .roster-avatar img{width:100%;height:100%;object-fit:cover;border-radius:50%}#screen .roster-avatar:after{content:'';position:absolute;bottom:0;right:0;width:8px;height:8px;border:1px solid #143523;background:#4cdb76;border-radius:50%}
#screen .home .mode-nav{left:7%;right:12%;top:40%;bottom:auto;gap:12px}#screen .home .mode-nav button,#screen .design-mode-samples>button{height:116px;position:relative;isolation:isolate;overflow:hidden;background:#168449;border:1px solid #90c0ff80;border-radius:8px;font-size:30px;font-weight:800;color:#fff;text-shadow:0 2px 3px #0009;box-shadow:0 4px 10px #0005;display:flex;align-items:center;justify-content:center;padding:12px}
#screen .home .mode-nav button:before,#screen .design-mode-samples>button:before{content:'';position:absolute;inset:0;z-index:-1;background:url('/assets/mode-surface.png') center/100% 100% no-repeat;opacity:1}#screen .home .mode-nav button:nth-child(1):before,#screen .design-mode-samples>button:nth-child(1):before{filter:hue-rotate(-95deg)}#screen .home .mode-nav button:nth-child(3):before,#screen .design-mode-samples>button:nth-child(3):before{filter:hue-rotate(175deg) saturate(1.3)}#screen .home .mode-nav button:hover{border-color:#fff;box-shadow:0 0 18px #ffffff2a}#screen .mode-watermark{width:90px;height:90px;left:calc(50% - 45px);top:13px;opacity:.18;z-index:-1}
#screen .home-activities{left:25%;right:25%;bottom:13%;display:grid;grid-template-columns:1fr 1fr;gap:14px}#screen .home-activities .activity{height:70px;padding:10px 13px;gap:10px;background:#0003;backdrop-filter:blur(5px);border:1px solid #ffffff50;border-radius:7px;color:#fff;box-shadow:0 3px 10px #0002;display:flex;align-items:center;text-align:left;position:relative}#screen .home-activities .activity:hover{background:#0005}#screen .activity strong{font-size:17px;white-space:nowrap}#screen .activity small{color:#f4f7fc;margin-top:3px;font-size:14px}#screen .activity-icon{width:30px;height:30px}#screen .activity .challenge-progress{font-size:21px;font-weight:650}#screen .activity-status{border:0;background:transparent;padding:0;color:#fff}#screen .home-activities .activity-cooldown{background:#0006;color:#a9b1b9;filter:grayscale(1)}#screen .activity-countdown{background:#0a1015bb;color:#d1dbe3}#screen .resume{background:#151b22ef;border:1px solid #ffffff40;border-radius:7px;right:90px;color:#fff}
/* Sheets, dialogs, drawers and notifications share a neutral dark surface. */
#screen #overlay{background:#0008;backdrop-filter:blur(3px)}#screen .dialog{background:#151b22f5;color:#f6f8fc;border:1px solid #ffffff38;border-radius:12px;box-shadow:0 20px 80px #0009}#screen .dialog-head,#screen .dialog-footer{border:0}#screen .dialog-head{padding:20px 22px 6px}#screen .dialog-body{padding:18px 22px}#screen .dialog-footer{padding:12px 22px 22px}#screen .dialog button{color:#f6f8fc}#screen .dialog.simple-dialog{padding:14px 10px}#screen #overlay .game-dialog-close{background:#354352;color:#fff;border:1px solid #95a6b8;box-shadow:0 2px 8px #0006}#screen #overlay .game-dialog-close:hover{background:#52677d}#screen .dialog .error-text{color:#ff929b;background:#ff697513}#screen .dialog input,#screen .dialog textarea{background:#0b1219;color:#fff;border-color:#586779}
#screen .chat-panel{background:#111820f7;border-color:#ffffff35;border-radius:0;backdrop-filter:blur(10px)}#screen #overlay .drawer-edge-collapse{background:#1b2b3b;color:#fff;border-color:#8fa0af}#screen #overlay .copy-invite-button{background:#23384f;color:#fff;border-color:#49627c}#screen .social-player-name,#screen .social-name,#screen .board-player,#screen .board-player:hover{background:transparent;box-shadow:none;border:0}#screen .profile-relationship-actions button{background:#283440}#screen .invite-notice{background:#182635f5;border:1px solid #75889a;border-radius:9px;box-shadow:0 8px 30px #0006}#screen .invite-notice p{color:#c2d1df}#screen #toast{background:#172b3ff2;border:1px solid #688aaa;border-radius:8px;box-shadow:0 6px 24px #0006;color:#fff}
#screen .challenge-cooling,#screen .reward-claimed{background:#141c24;color:#8795a2;border-color:#ffffff12}#screen .challenge-entry button:disabled{background:#25323c;color:#b3bfcc}#screen .claimed-reward>small,#screen .inline-countdown,#screen .coin-sources-hint{color:#aabbca}#screen .reward-total,#screen .settlement-earnings>.coin-amount{color:#ffd165}#screen .settlement-earnings>p,#screen .settlement-earnings>small{color:#b3bfcc}#screen .match-stat-comparison>div:nth-child(odd){background:#ffffff08}
/* Equipment and honor cabinet. */
#screen .gear-card .gear-preview,#screen .gear-preview{background:transparent;box-shadow:none;border:0}#screen .gear-card.gear-equipped,#screen .gear-overview-item.gear-equipped{background:#15392a;border:2px solid #50c586;box-shadow:inset 0 0 20px #36a96910}#screen .gear-card{padding:13px;border-radius:10px}#screen .gear-overview-item{background:#1a2631;border-radius:9px}#screen .gear-art{width:100%;height:90px;object-fit:contain;display:block;filter:drop-shadow(0 7px 7px #0005)}#screen .gear-long-grid .gear-art{height:84px}#screen .gear-detail-art{background:#090e1466;border:1px solid #ffffff18;border-radius:9px;padding:14px}#screen .gear-detail-art .gear-art{height:130px}#screen .gear-tier-tag{background:#254c37;color:#c4ebd3;border:1px solid #5da27655}#screen .gear-card-property,#screen .gear-description,#screen .gear-summary small,#screen .gear-properties small{color:#b3bfcc}#screen .gear-card-property b{color:#a4dfbc}#screen .gear-card-actions>button:disabled{opacity:1;background:#195034;color:#91e0b4;border-color:#43986a}#screen .gear-properties{padding:14px}#screen .gear-overview-item small{color:#adc4d5}
#screen .honor-cabinet{background:#0a1119;border-radius:9px;padding:18px;gap:22px 12px}#screen .honor-display{border-bottom:5px solid #354451;padding-bottom:16px;box-shadow:0 7px 8px -8px #000}#screen .honor-display>span,#screen .honor-display>time{color:#9fb0bf}#screen .honor-trophy{height:108px;width:108px;object-fit:contain;filter:drop-shadow(0 4px 6px #0008)}#screen .trophy-silver{filter:grayscale(1) brightness(1.2) drop-shadow(0 4px 6px #0008)}#screen .trophy-bronze{filter:sepia(.55) saturate(.8) brightness(.85) drop-shadow(0 4px 6px #0008)}#screen .trophy-break{filter:hue-rotate(145deg) drop-shadow(0 4px 6px #0008)}
#screen .coin-symbol{display:inline-block;width:23px;height:23px;background:url('/assets/gold-coin.png') center/contain no-repeat;border:0;border-radius:0;box-shadow:none;color:transparent;font-size:0;vertical-align:middle}#screen .coin-symbol:before,#screen .coin-symbol:after{display:none}
/* Arena selectors and game overlays. The scene itself is the current real renderer capture. */
#screen .ranked-fields{gap:18px}#screen .ranked-field{position:relative;overflow:hidden;background:#12334c;border:1px solid #39789c;border-radius:10px;box-shadow:0 7px 20px #0003;padding:22px}#screen .ranked-field:nth-child(2){background:#113c43;border-color:#2f8384}#screen .ranked-field:nth-child(3){background:#352855;border-color:#775d9f}#screen .ranked-field:nth-child(4){background:#533b1c;border-color:#b58a42}#screen .ranked-field:hover{border-color:#e2ecff;box-shadow:0 0 15px #ffffff15}#screen .ranked-field strong{font-size:28px}#screen .ranked-field small{color:#bfd0df}#screen .ranked-field .ui-icon{position:absolute;right:22px;top:calc(50% - 40px);width:80px;height:80px;opacity:.2}
#screen .existing-practice{background:#092116;overflow:hidden}#screen .practice-scene{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;pointer-events:none}#screen .existing-control{background:#0005;border-color:#ffffff38;color:#fff;backdrop-filter:blur(4px)}#screen .existing-control button,#screen .existing-control summary{background:#0003;color:#fff;border-color:#ffffff30;box-shadow:none}#screen .existing-views button.active{background:#1b76b799;color:#fff;border-color:#9ed3ff}#screen .existing-tip,#screen .existing-power{background:transparent;border:0;backdrop-filter:none}#screen .practice-pullup,#screen .game-menu-items,#screen .match-quick-chat>div,#screen .replay-frame-picker>div{background:#15202bf5;color:#fff;border:1px solid #ffffff40;border-radius:8px;box-shadow:0 8px 30px #0007}#screen .practice-pullup small{background:#ffffff0b;color:#a8c1d6}#screen .game-menu>summary,#screen .match-quick-chat>summary{background:#0005;color:#fff;border-color:#ffffff38}#screen .game-menu-items button{background:transparent;color:#fff}#screen .placement-state{background:#172c3de8;color:#fff}
#screen .online-game-top{background:#0006;border:0;border-bottom:1px solid #ffffff20;backdrop-filter:blur(5px);color:#fff}#screen .online-game-top .online-game-actions>button,#screen .online-game-top .match-quick-chat>summary,#screen .network-control .network{background:#0003;border-color:#ffffff35;color:#fff}#screen .network-popover{background:rgba(9,22,30,.45);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);color:#e9f3ff;border-color:#748ba2}#screen .online-game-status strong{font-weight:600}#screen .table-system-message{color:#ffdb82}#screen .fullscreen-button{background:#0004;color:#fff;border-color:#ffffff40}
#screen .scoreboard-main>.scoreboard-player{background:#101b25e8;border-color:#5c7184;color:#fff}#screen .scoreboard-main>.scoreboard-player.current{background:#163c3be8;border-color:#70ba9d}#screen .scoreboard-main>.central-score{background:#0b1725f2;color:#fff;border-color:#5c7184}#screen .scoreboard-player .scoreboard-identity{color:#fff}#screen .frame-tally{background:#155242;color:#f0f9f7;border:0}#screen .player-clock{color:#f4d888;border-color:#d8bc7644}#screen .player-turn-arrow{color:#e9cb67}#screen .floating-break{background:#112532e8;border-color:#6c8896;color:#fff}#screen .frame-points{color:#fff}
#screen .table-decision{background:#15202beb;border:1px solid #a1b4c066!important;box-shadow:0 8px 25px #0004;border-radius:8px;color:#fff}#screen .table-decision-caption{background:transparent;color:#fff}#screen .table-decision-buttons>button{background:#168449!important;border-color:#8399af;color:#fff}#screen .table-decision-buttons>button:hover{background:#209b59!important}
#screen .match-found-overlay{background:#06101ccc;backdrop-filter:blur(6px);color:#fff}#screen .match-found-center{width:min(680px,90%)}#screen .match-found-person .avatar{border:2px solid #aecbdc}#screen .match-found-vs{color:#f6ce70;text-shadow:0 4px 16px #0007}#screen .match-countdown{color:#f9dc95}#screen .match-found-pair{padding:20px 0}#screen .opening-rules{color:#c4d6e6}
#screen .room-loading{background:#0c161e url('/assets/lobby-crucible-v11-camera150.webp') center/cover}#screen .room-load-control{background:#0005;padding:24px;border-radius:10px;backdrop-filter:blur(8px)}#screen .room-load-track{background:#0008;border:1px solid #adcbdc70;border-radius:7px;overflow:hidden;color:#fff}#screen .room-load-track>span{background:#168449}#screen .load-tip{color:#eff5fb;text-shadow:0 1px 2px #000}#screen .room-load-control>.load-start{background:#168449;color:#fff;border-color:#49ad76}
#screen .replay-rail>button,#screen .replay-rail summary{background:#0007;border-color:#ffffff48;color:#fff}#screen .replay-rail>.replay-view.active{background:#168449d9;border-color:#9bdfb7}#screen .replay-position,#screen .replay-training-stat{background:#0006;color:#fff}#screen .cue-track{background:#15130e55;border-color:#a8aca6}#screen .cue-track>i{background:#ebd78288}#screen .cue-shaft{background:url('/assets/cue.png') center/cover;color:#fff}#screen .tip-marker{background:#d65958;border:1px solid #542222}#screen .observation-stick>span{background:#ffffff29;border-color:#ced7dc88}
#screen.portrait .topbar{height:94px;min-height:94px;flex-wrap:wrap}#screen.portrait .topbar>button{font-size:13px;min-height:44px;padding:5px 8px}#screen.portrait .topbar .ui-icon{width:20px;height:20px}#screen.portrait .topbar .avatar{display:inline-flex;width:29px;height:29px}#screen.portrait .home .roster{width:58px}#screen.portrait .home .roster-avatar{display:block;width:36px;height:36px}#screen.portrait .home .mode-nav{left:24px;right:82px;top:23%;grid-template-columns:1fr;gap:16px}#screen.portrait .home .mode-nav button{height:120px;font-size:32px}#screen.portrait .home-activities{left:24px;right:82px;bottom:6%;grid-template-columns:1fr 1fr;gap:10px}#screen.portrait .home-activities .activity{height:84px;padding:8px;flex-wrap:wrap;gap:4px}#screen.portrait .activity strong{font-size:15px}#screen.portrait .activity-icon{width:23px;height:23px}#screen.portrait .home .resume{right:72px;left:16px}#screen.portrait .gear-art{height:90px}#screen.portrait .page{padding:18px}#screen.portrait .dialog-head{padding:16px 18px 4px}#screen.portrait .dialog-body{padding:14px 18px}#screen.portrait .dialog-footer{padding:10px 18px 18px}
@media(prefers-reduced-motion:reduce){#screen button,#screen summary{transition:none}}
#screen .coin-icon{width:24px;height:24px;object-fit:contain;vertical-align:middle}#screen .topbar .coin-icon{width:30px;height:30px}#screen .settlement-earnings .coin-icon{width:38px;height:38px}
#screen .cue-power-control{background:url('/assets/power-control.png') center/contain no-repeat!important;border:0!important;box-shadow:none!important}#screen .cue-power-control .cue-track,#screen .cue-power-control .cue-shaft{visibility:hidden}#screen .cue-power-control:active:not([data-product-press="cancelled"]){filter:brightness(1.18)}#screen .tip-visible-disc{background:url('/assets/tip-control.png') center/contain no-repeat;border:0;box-shadow:none}#screen .tip-marker{box-shadow:0 0 0 1px #0004}
#screen .home-activities .activity{width:100%;flex-direction:row;justify-content:center;overflow:visible;display:grid;grid-template-columns:34px 1fr;grid-template-rows:1fr 1fr;column-gap:12px;row-gap:0}#screen .home-activities .activity-icon{grid-row:1/3;grid-column:1}#screen .home-activities .activity>strong{grid-column:2;align-self:end}#screen .home-activities .activity>small,#screen .home-activities .activity>.challenge-progress{grid-column:2;align-self:start;justify-self:start}#screen .home .mode-nav button:nth-child(1):before{filter:hue-rotate(-95deg) brightness(1.15)}#screen .home .mode-nav button:nth-child(3):before{filter:hue-rotate(170deg) saturate(1.2) brightness(1.55)}#screen.portrait .home-activities .activity{width:100%;grid-template-columns:26px 1fr;column-gap:6px}
/* Keep short action labels intact; content cards may intentionally wrap. */
#screen button{white-space:nowrap}
#screen :is(.gear-preview,.gear-overview-item,.ranked-field,.activity,.message-card,.room-choice button){white-space:normal}
#screen .empty .actions{width:auto;max-width:100%;flex-wrap:wrap;justify-content:center}
#screen .empty .actions button{min-width:112px;flex:0 0 auto}
#screen .existing-views button.active{background:#168449!important;border-color:#49ad76!important}
#screen .room-full-state .actions{width:auto;max-width:100%;flex-wrap:wrap}#screen .room-full-state .actions button{min-width:112px;flex:0 0 auto}

#screen .avatar-options>button{border-radius:50%;overflow:hidden;width:56px;height:56px;flex:0 0 56px}#screen .avatar-options>button img{width:100%;height:100%;display:block;object-fit:cover}#screen .avatar-options>button.active{outline:2px solid #50c586;outline-offset:2px}#screen .avatar-upload{border-radius:6px;background:#25303b;min-height:44px;display:flex;align-items:center;padding:10px}
#screen .match-stat-head .avatar{width:40px;height:40px;display:inline-flex;flex-shrink:0;border-radius:50%}#screen .match-stat-head>span{display:flex;gap:8px;align-items:center;justify-content:center}
#screen .observation-stick{border-radius:50%!important}#screen .board-own{background:#1b3b2b;border-color:#5c9070}
#screen.portrait .topbar{display:grid;grid-template-columns:1.4fr 1.15fr 1fr 1fr;height:100px;min-height:100px}
#screen.portrait .topbar>button,#screen.portrait .topbar>.network-control{width:auto;min-width:0;max-width:none;min-height:50px;gap:5px;font-size:13px}
#screen.portrait .topbar .identity{max-width:none}#screen.portrait .topbar .message-count{flex-shrink:0}
#screen.portrait .honor-cabinet{grid-template-columns:repeat(3,minmax(0,1fr))}
#screen .match-stat-comparison>div{border-color:#ffffff16}
#screen .room-form-row{border-color:#ffffff16}
#screen .player-profile-footer{justify-content:flex-end}

#screen .player-actions{justify-content:flex-end}
#screen .gear-categories{display:flex;flex-direction:column;overflow:hidden}#screen .gear-categories>button{flex:1;min-height:0;padding-top:8px;padding-bottom:8px}
/* Lobby review: shared 50% black surfaces, compact actions and consistent notices. */
#screen .topbar,#screen .home .roster,#screen .home-activities .activity{background:rgba(0,0,0,.5)}
#screen .topbar .identity{flex:0 0 208px;min-width:208px;gap:6px}
#screen .identity-name{white-space:nowrap;min-width:6em;text-align:left}
#screen .topbar>.message-entry{flex:0 0 64px;min-width:64px;gap:4px}
#screen .topbar>.message-entry .message-count{position:absolute;right:8px;top:5px;min-width:18px;height:18px;line-height:18px;padding:0 4px;font-size:11px;border-radius:12px}
#screen .home-activities,#screen.portrait .home-activities{left:24px;right:92px;bottom:13%;display:flex;justify-content:center;gap:12px;flex-wrap:wrap;grid-template-columns:none}
#screen .home-activities .activity,#screen.portrait .home-activities .activity{width:max-content;flex:0 0 auto;min-width:144px;height:72px;padding:10px 14px;grid-template-columns:30px max-content;column-gap:10px;row-gap:0}
#screen .home-activities .activity:hover{background:rgba(0,0,0,.6)}
#screen .home-activities .activity-cooldown:disabled{opacity:1;filter:grayscale(1);background:rgba(0,0,0,.5)}
#screen .activity-cooldown>strong{opacity:.8;position:relative;z-index:1}
#screen .activity-cooldown>small{opacity:.2}
#screen .activity-cooldown>.activity-icon{opacity:.35}
#screen .activity-countdown{border-radius:inherit;background:rgba(0,0,0,.18);display:flex;flex-direction:row;align-items:flex-end;justify-content:flex-end;padding:0 10px 8px;gap:5px;color:#f0f0f0}
#screen .activity-countdown svg{width:16px;height:16px;margin-bottom:1px}#screen .activity-countdown time{font-size:13px;line-height:18px}
#screen #overlay .game-dialog-close{width:44px;height:44px;min-height:44px;right:-22px;top:-22px;padding:0;display:grid;place-items:center;line-height:1;background:linear-gradient(155deg,#f56667,#c82739 75%);border:2px solid #ffc1bb;box-shadow:inset 0 1px 2px #ffffff70,0 3px 9px #0008;color:white}
#screen #overlay .game-dialog-close svg{display:block;width:26px;height:26px;margin:0;flex:none}
#screen #overlay .game-dialog-close:hover{background:linear-gradient(155deg,#ff7d79,#dc3545 75%)}
#screen .top-notice{width:max-content;max-width:calc(100% - 40px);padding:14px 18px;display:flex;flex-direction:column;align-items:stretch;gap:12px;animation:inviteSlide .25s ease-out}
/* Match the collapsed online-player entry; blur only the small UI surfaces. */
#screen .topbar{background:rgba(9,22,30,.2);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)}
#screen :is(.top-notice,.announcement-banner){background:rgba(9,22,30,.45);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)}
#screen :is(.top-notice,.announcement-banner){border:1px solid #ffffff30;border-radius:12px;box-shadow:0 4px 16px #0002}
#screen .top-notice .notice-copy{min-width:0;text-align:left}#screen .top-notice strong{font-size:17px;line-height:1.5}#screen .top-notice p{font-size:13px;line-height:1.5;margin:5px 0 0;color:#b3bfcc}
#screen .top-notice .notice-heading{justify-content:flex-start;gap:8px}#screen .top-notice .notice-heading>.avatar{flex-shrink:0;margin-right:0}
#screen .notice-actions{display:flex;align-items:center;justify-content:center;gap:8px;flex-wrap:wrap}
#screen .notice-actions .message-actions{display:contents}#screen .notice-actions button{min-width:68px;min-height:40px;padding:8px 14px;margin:0}
#screen .home .resume,#screen.portrait .home .resume{left:50%;right:auto;top:18px;bottom:auto;transform:translateX(-50%);max-width:calc(100% - 120px);z-index:3;animation:noticeDrop .25s ease-out}
#screen #inviteNotification,#screen.portrait #inviteNotification{width:max-content;max-width:calc(100% - 40px);top:12px}
#screen #inviteNotification .top-notice{max-width:100%}
#screen #toast{width:max-content;max-width:calc(100% - 40px);background:rgba(9,22,30,.72);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);border:0;text-align:left}
#screen.portrait .topbar{grid-template-columns:repeat(12,minmax(0,1fr));grid-template-rows:50px 50px}
#screen.portrait .topbar .identity{grid-column:span 5;min-width:0;width:auto;gap:4px;font-size:13px}
#screen.portrait .topbar [data-value="wallet"]{grid-column:span 3}
#screen.portrait .topbar [data-value="equipment"]{grid-column:span 4}
#screen.portrait .topbar [data-value="leaderboard"],#screen.portrait .topbar [data-value="records"]{grid-column:span 3}
#screen.portrait .topbar>.message-entry,#screen.portrait .topbar>.network-control,#screen.portrait .topbar>.fullscreen-button{grid-column:span 2;min-width:0}
#screen.portrait .topbar .identity-name{min-width:6em;font-size:13px}#screen.portrait .topbar .level-badge{font-size:10px}
#screen.portrait .topbar:has(.identity[data-act="dialog"]) .identity{grid-column:span 8}
#screen.portrait .home-activities{right:72px;bottom:6%;gap:8px}
#screen.portrait .home-activities .activity{min-width:0;padding:10px 9px;grid-template-columns:23px max-content;column-gap:6px;height:72px}
@keyframes noticeDrop{from{transform:translate(-50%,-120%);opacity:0}to{transform:translate(-50%,0);opacity:1}}
@media(prefers-reduced-motion:reduce){#screen .top-notice,#screen .home .resume{animation:none}}
/* Shared action sizes: 1\u20134 character labels use identical geometry. */
#screen{--action-width:96px;--action-height:44px;--action-gap:12px}
#screen button.standard-action{width:var(--action-width);min-width:var(--action-width);height:var(--action-height);min-height:var(--action-height);max-height:var(--action-height);flex:0 0 var(--action-width);padding:0 12px;display:inline-flex;align-items:center;justify-content:center;gap:6px;font-size:14px;line-height:1.2;white-space:nowrap}
#screen button.standard-action.long-action{width:auto;min-width:112px;flex-basis:auto}
#screen .actions,#screen .notice-actions,#screen .message-actions{gap:var(--action-gap)}
#screen .dialog-footer .actions{justify-content:flex-end;flex-wrap:wrap}
#screen #overlay:is([data-drawer="login"],[data-drawer="login-code"]) .dialog-footer .actions>button{width:100%;flex:1 1 100%;min-width:0}
#screen #overlay:is([data-drawer="first-profile"],[data-drawer="profile-edit"]) .dialog-footer .actions{display:grid;grid-template-columns:1fr 1fr;gap:12px;width:100%}
#screen #overlay:is([data-drawer="first-profile"],[data-drawer="profile-edit"]) .dialog-footer .actions>button{width:100%;min-width:0}
#screen .challenge-item,#screen.portrait .challenge-item{grid-template-columns:minmax(0,1fr) 60px 96px 96px;gap:10px}
#screen .challenge-entry,#screen .challenge-reward-entry{grid-column:auto;justify-content:flex-end}
#screen.portrait .challenge-item{grid-template-columns:minmax(0,1fr) 48px 96px 96px;gap:8px;padding:12px 10px}
#screen .challenge-copy strong{font-size:16px}#screen.portrait .challenge-copy strong{font-size:14px}
#screen .activity-cooldown>strong{opacity:.65;z-index:auto}
#screen .activity-countdown{align-items:center;justify-content:center;flex-direction:row;inset:0;padding:0;gap:6px;background:rgba(0,0,0,.22);text-shadow:0 1px 4px #000}
#screen .activity-countdown svg{width:26px;height:26px;margin:0}#screen .activity-countdown time{font-size:21px;line-height:25px;font-weight:750}
#screen input:focus,#screen input:focus-visible,#screen textarea:focus,#screen textarea:focus-visible{outline:none!important;box-shadow:none!important;border-color:#36a76b!important}
#screen .code-heading{height:32px;min-height:32px;display:flex;align-items:center;gap:10px;margin:12px 0 4px}
#screen .code-heading label{white-space:nowrap;margin:0;flex:none}#screen .field-error{font-size:12px;line-height:16px;color:#ff929b;min-width:0;margin:0;padding:0;background:none;border:0}
#screen .avatar-options{display:flex;align-items:center;gap:14px;flex-wrap:nowrap}
#screen .avatar-options .avatar-upload{display:grid;place-items:center;width:64px;height:64px;min-height:64px;min-width:64px;flex:0 0 64px;border-radius:50%;padding:0;overflow:hidden;background:#253b32;border:1px solid #6d8d7d;color:#d5eddf;cursor:pointer}
#screen .avatar-upload:focus-within{border-color:#36a76b;outline:2px solid #36a76b;outline-offset:3px}
#screen .avatar-upload #uploadedAvatar{margin:0;display:grid;place-items:center;width:100%;height:100%}
#screen .avatar-upload #uploadedAvatar svg{width:28px;height:28px}#screen .avatar-upload #uploadedAvatar img{width:100%;height:100%;object-fit:cover;border-radius:50%}
#screen .avatar-upload input{height:100%;min-height:0;inset:0;padding:0;cursor:pointer}
#screen .avatar-options>small{font-size:12px;line-height:1.5}
#screen .top-notice[data-exiting="true"]{pointer-events:none}

#screen .gear-card-actions button.standard-action{width:auto;min-width:0;flex:1 1 0;padding:0 6px;font-size:12px}
/* Mobile controls: shared switch, semantic actions, and a single-layer game menu. */
#screen input.switch{appearance:none;-webkit-appearance:none;position:relative;display:inline-block;width:50px!important;min-width:50px;height:28px;padding:0;margin:0;border:1px solid #82908b;border-radius:99px;background:#48524e;cursor:pointer;transition:background .18s;flex:0 0 50px}
#screen input.switch:before{content:'';position:absolute;left:3px;top:3px;width:20px;height:20px;border-radius:50%;background:#fff;box-shadow:0 1px 3px #0005;transition:transform .18s}
#screen input.switch:checked{background:#218750;border-color:#59b980}#screen input.switch:checked:before{transform:translateX(22px)}
#screen button.danger{background:#ae343e!important;border:1px solid #e56972!important;color:#fff!important;box-shadow:inset 0 1px #ffffff20}
#screen .game-menu-items{padding:0;gap:0;border-radius:7px;background:rgba(9,22,30,.45);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)}
#screen .game-menu-items button{width:100%;height:46px;margin:0;padding:0 18px;border:0;border-radius:0;box-shadow:none;background:transparent;text-align:left;color:#f2f4f2}
#screen .game-menu-items button+button{border-top:1px solid #ffffff24}#screen .game-menu-items button:hover{background:#ffffff12}
#screen .nickname-heading{margin-top:0}#screen .nickname-heading .field-error{margin-left:auto;font-size:12px}
#screen .challenge-completion-mark{margin:0 auto 10px;width:48px;height:48px;border-radius:50%;display:grid;place-items:center;background:#21875030;border:1px solid #6bc69170;color:#8ad5a7;font-size:28px}
#screen .challenge-name{text-align:center;font-size:22px;margin:0 0 18px;color:#f3f7f4}
#screen .challenge-result-stats{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:18px}
#screen .challenge-result-stats>div{padding:14px;background:#ffffff06;border-radius:7px;text-align:center}
#screen .challenge-result-stats small{display:block;color:#a9b5ad;font-size:13px;margin-bottom:6px}
#screen .challenge-result-stats strong{font-size:30px;font-variant-numeric:tabular-nums;color:#fff}#screen .challenge-result-stats strong span{font-size:13px;font-weight:400;color:#a9b5ad}
#screen .challenge-reward .reward-action{background:#26362d;border:1px solid #648c73;color:#d6ecdd;box-shadow:none}
/* Practice HUD: scene image contains no UI; only the wrapper paints the control surface. */
#screen .existing-control:not(.existing-tip):not(.existing-power){background:rgba(3,11,23,.42);border:1px solid rgba(211,154,76,.72);border-radius:6px;color:#f3ead6;backdrop-filter:none}
#screen .existing-control button,#screen .existing-control summary{background:transparent;border:0;box-shadow:none;color:#f3ead6}
#screen .existing-views{overflow:hidden}#screen .existing-views button+button{border-left:1px solid #d39a4c60}
#screen .existing-views button.active{background:#385b4077!important;border:0!important;color:#f3ead6}
#screen .practice-placement-button{display:flex;align-items:center;justify-content:space-around;gap:4px}
#screen .mini-toggle{width:26px;height:14px;border-radius:12px;background:#6c756f;position:relative;flex-shrink:0}#screen .mini-toggle:before{content:'';position:absolute;left:2px;top:2px;width:10px;height:10px;background:#fff;border-radius:50%}#screen .mini-toggle.on{background:#278c51}#screen .mini-toggle.on:before{left:14px}
#screen .challenge-result .challenge-completion-mark{width:36px;height:36px;font-size:23px;margin-bottom:8px}
#screen .challenge-result .challenge-name{margin-bottom:12px;font-size:20px}
#screen .challenge-result-stats{margin-bottom:12px}#screen .challenge-result-stats>div{padding:10px}
#screen .challenge-result .challenge-reward{margin:0;padding:12px;min-height:68px}
#screen .challenge-reward>div{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
#screen .challenge-reward>div>span{margin:0;font-size:21px}#screen .challenge-reward .coin-symbol{margin:0}
#screen .nickname-heading label{display:flex;align-items:center;gap:6px;white-space:nowrap;flex-shrink:0}
#screen .nickname-heading label small{display:inline;margin:0;font-size:11px;line-height:1;color:#a9b5ad}

/* Compact daily challenge: a single action for each lifecycle state. */
#screen .required-mark{color:#ff7c87;font-size:16px;line-height:1}
#screen #overlay[data-drawer=training-challenges] .dialog{width:480px;max-width:calc(100% - 20px)}
#screen .challenge-item,#screen.portrait .challenge-item{grid-template-columns:minmax(0,1fr) auto 96px;gap:10px;min-height:76px;padding:12px}
#screen .challenge-copy strong,#screen.portrait .challenge-copy strong{font-size:15px;white-space:nowrap}
#screen .challenge-amount,#screen.portrait .challenge-amount{display:flex;align-items:center;gap:3px;white-space:nowrap;font-size:13px}
#screen .challenge-amount .coin-symbol{width:18px;height:18px}
#screen .challenge-entry{display:flex;justify-content:flex-end}
#screen button.challenge-countdown.standard-action{width:96px;min-width:96px;flex:0 0 96px;gap:4px;padding:0 5px;color:#b2bbb6;background:#26312b;border-color:#536058;font-size:13px;opacity:.7}
#screen .challenge-countdown svg{width:16px;height:16px;flex-shrink:0}#screen .challenge-countdown time{font-variant-numeric:tabular-nums}
/* Modal alignment: compact confirmations and centered footer actions. */
#screen .nickname-heading .field-error{margin-left:0}
#screen .dialog-footer .actions,#screen #overlay .dialog-footer .player-actions{justify-content:center}
#screen #overlay .simple-dialog,#screen.portrait #overlay .simple-dialog{width:360px;min-height:0;padding:24px;gap:22px}
#screen #overlay .simple-dialog .dialog-head{padding:0;min-height:0;justify-content:center;text-align:center}
#screen #overlay .simple-dialog .dialog-head h2{font-size:19px;line-height:1.5;margin:0;font-weight:600}
#screen #overlay .simple-dialog .dialog-footer{padding:0}
#screen .challenge-result-stats.three-stats{grid-template-columns:repeat(3,minmax(0,1fr))}
#screen .challenge-result-stats .shape-name{font-size:18px;line-height:35px}
#screen #overlay:is([data-drawer=training-clear],[data-drawer=training-claimed],[data-drawer=training-repeat],[data-drawer=practice-record]) .dialog{width:490px}
#screen #overlay:is([data-drawer=training-clear],[data-drawer=training-claimed],[data-drawer=training-repeat],[data-drawer=practice-record]) .dialog-body{overflow:visible;flex:0 0 auto}
#screen .challenge-result-stats{margin-bottom:12px}
.preview-variants{flex:1 0 100%;margin-top:10px;border-top:1px solid #d4d4d4;padding-top:12px}.preview-variants>strong{display:block;margin-bottom:8px}.preview-variants>div{display:flex;flex-wrap:wrap;gap:6px}.preview-variants button.active{border-color:#328956;background:#e2eee7}
/* Content-rich dialogs still fit a landscape canvas without internal scrolling. */
#screen:not(.portrait) #overlay[data-drawer=gear-detail] .gear-detail-art{padding:8px}
#screen:not(.portrait) #overlay[data-drawer=gear-detail] .gear-detail-art .gear-art{height:104px}
#screen:not(.portrait) #overlay[data-drawer=season-rules] .dialog-body p{margin:8px 0}
#screen:not(.portrait) #overlay[data-drawer=season-rules] .table td{padding:7px 10px}
#screen:not(.portrait) #overlay[data-drawer=season-reward] .dialog-body p{margin:8px 0}
#screen:not(.portrait) #overlay[data-drawer=gear-detail] .gear-detail-art{height:auto;margin-bottom:8px}
#screen:not(.portrait) #overlay[data-drawer=gear-detail] .gear-detail-art .gear-art{height:72px}
#screen:not(.portrait) #overlay[data-drawer=gear-detail] .gear-properties{margin:8px 0;padding:10px}
#screen:not(.portrait) #overlay[data-drawer=gear-detail] .gear-detail-price{margin:8px 0 0}
#screen:not(.portrait) #overlay[data-drawer=season-reward] .season-trophies{margin:6px 0}
#screen:not(.portrait) #overlay[data-drawer=season-reward] .dialog-body{padding-top:8px;padding-bottom:8px}
/* Room setup: spacing carries hierarchy; the bottom action spans the page. */
#screen .room-option{border:0;padding:10px 0;min-height:68px;gap:24px}
#screen .room-config{display:flex;flex-direction:column;gap:12px;max-width:800px}
#screen .page:has(.room-config)>.page-footer{border:0;max-width:none;width:100%;padding:12px 0 0;margin:0}
#screen .page:has(.room-config)>.page-footer button{width:100%;max-width:none;flex:1;height:52px;font-size:18px}
#screen.portrait .room-option{padding:14px 0;min-height:112px}
#screen .room-load-control{background:transparent;border:0;box-shadow:none;backdrop-filter:none;padding:0}
#screen .load-tip{background:transparent;box-shadow:none;text-shadow:0 1px 3px #000}
#screen .match-quick-chat>summary{width:38px;height:36px;min-width:38px;padding:0;display:flex;align-items:center;justify-content:center;box-sizing:border-box}
#screen .match-quick-chat>summary::marker,#screen .match-quick-chat>summary::-webkit-details-marker{display:none}
/* Waiting status stays static, including on mobile compositors. */
#screen #overlay:is([data-drawer=online],[data-drawer=online-empty],[data-drawer=invite-player]) .chat-panel{width:380px;background:#141c22fa;border-left:1px solid #ffffff24;box-shadow:-12px 0 32px #0005}
#screen #overlay .chat-panel:has(.social-tabs) .dialog-head{padding:12px 16px;min-height:64px;display:flex}
#screen #overlay .chat-panel .social-tabs{width:100%;margin:0;display:flex;flex:1}
#screen #overlay .social-tabs button{flex:1;width:auto;min-width:0;height:42px;border:0;border-radius:0;background:transparent;color:#aab8bc;border-bottom:2px solid transparent}
#screen #overlay .social-tabs button.active{background:#39865420;border-bottom-color:#66bd83;color:#e1f7e8}
#screen #overlay .chat-panel:has(.social-tabs) .dialog-body{padding:0 12px 0 16px;overflow-y:scroll;scrollbar-gutter:stable;scrollbar-width:thin;scrollbar-color:#79918a #ffffff0a}
#screen #overlay .chat-panel .dialog-body::-webkit-scrollbar{width:6px}
#screen #overlay .chat-panel .dialog-body::-webkit-scrollbar-thumb{background:#79918a;border-radius:6px}
#screen #overlay .chat-panel .dialog-body::-webkit-scrollbar-track{background:#ffffff0a}
#screen #playerList .social-player-row{min-height:82px;padding:12px 0;gap:12px;border:0;border-bottom:1px solid #ffffff0a}
#screen #playerList .social-avatar{width:44px;height:44px;min-width:44px;min-height:44px;flex:0 0 44px;border-radius:50%;overflow:hidden;padding:0;border:1px solid #ffffff35;background:#31443c}
#screen #playerList .social-avatar img{display:block;width:100%;height:100%;object-fit:cover}
#screen .social-name-line{display:flex;align-items:center;gap:7px}
#screen #playerList .social-name-line .linkbtn{border:0;background:none;box-shadow:none;min-width:0;max-width:110px;width:auto;height:auto;min-height:26px;padding:0;text-align:left;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#screen .social-level{font-size:11px;color:#b2c8b9;white-space:nowrap}
#screen .social-status{font-size:12px;color:#95aaa1;margin-top:4px}
#screen #playerList .social-player-row>button:last-child{width:72px;min-width:72px;height:38px;min-height:38px;padding:0;flex:none;font-size:14px;border-radius:7px}
#screen #playerList .social-spectate{background:#ffffff08;border:1px solid #6b858d;color:#bcdde4;box-shadow:none}
#screen #playerList .social-spectate[aria-disabled="true"]{background:#ffffff04;border-color:#ffffff20;color:#ffffff55;box-shadow:none;cursor:default}
#screen #overlay .drawer-edge-collapse{position:absolute;left:-26px;top:50%;transform:translateY(-50%);width:26px;min-width:26px;height:64px;min-height:64px;padding:0;display:flex;align-items:center;justify-content:center;border:1px solid #ffffff30;border-right:0;border-radius:10px 0 0 10px;background:#25352eee;color:#d7ece0;box-shadow:-4px 2px 12px #0003}
#screen #overlay .social-scroll-track{position:absolute;right:5px;top:84px;bottom:16px;width:4px;border-radius:4px;background:#ffffff12;pointer-events:none}
#screen #overlay .social-scroll-track[hidden]{display:none}
#screen #overlay .social-scroll-track span{position:absolute;left:0;width:100%;border-radius:4px;background:#8ba699;min-height:24px}
#screen .match-quick-chat>summary{width:40px;min-width:40px;height:40px}
/* Compact player profiles and aggregated honors. */
#screen .profile-stat-grid .match-stat>div{display:flex;flex-direction:row;justify-content:space-evenly;gap:14px}
#screen .profile-stat-grid .match-stat>div>span{display:flex;align-items:baseline;gap:6px;white-space:nowrap}
#screen .profile-stat-grid .match-stat b{display:inline;margin:0;font-size:24px}
#screen #overlay:is([data-drawer=player],[data-drawer=duel-profile]) .dialog{width:620px}
#screen #overlay:is([data-drawer=player],[data-drawer=duel-profile]) .profile-stat-grid{grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
#screen #overlay:is([data-drawer=player],[data-drawer=duel-profile]) .profile-stat-grid .match-stat{grid-column:span 2}
#screen #overlay:is([data-drawer=player],[data-drawer=duel-profile]) .profile-stat-grid>div{padding:10px 8px;min-height:64px}
#screen #overlay:is([data-drawer=player],[data-drawer=duel-profile]) .dialog-body{padding:10px 18px;overflow:visible}
#screen .player-tab-content{max-height:none;overflow:visible}
#screen .honor-cabinet{grid-template-columns:repeat(4,minmax(0,1fr));background:transparent;border:0;box-shadow:none;padding:12px 0;gap:12px}
#screen .honor-display{padding:8px 0;margin:0;border:0;box-shadow:none;background:transparent;gap:8px}
#screen .honor-display::before,#screen .honor-display::after{display:none}
#screen .honor-count-art{display:flex;align-items:center;justify-content:center;gap:4px}
#screen .honor-count{font-size:20px;font-weight:700;color:#e4ce90;white-space:nowrap}
#screen .honor-display.unearned{opacity:.45}
#screen .player-tab-content .honor-trophy{width:76px;height:90px}
#screen.portrait .honor-cabinet,#screen.portrait .player-tab-content .honor-cabinet{grid-template-columns:repeat(2,minmax(0,1fr))}
#screen.portrait #overlay:is([data-drawer=player],[data-drawer=duel-profile]) .profile-stat-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
#screen.portrait #overlay:is([data-drawer=player],[data-drawer=duel-profile]) .profile-stat-grid .match-stat{grid-column:span 1}
#screen .level-badge,#screen .topbar .level-badge{display:inline-flex;align-items:center;flex:none;white-space:nowrap;font-size:11px;line-height:18px;padding:1px 6px;border:1px solid #54a47460;border-radius:5px;background:#244b36;color:#a0e1b6;margin:0}
#screen .status-badge{display:inline-flex;align-items:center;width:max-content;font-size:11px;line-height:18px;padding:1px 6px;border-radius:5px;border:1px solid;white-space:nowrap}
#screen .status-idle{color:#99e1b2;background:#28543a88;border-color:#4b9c6b70}
#screen .status-playing{color:#efce89;background:#6d512d66;border-color:#b28d5266}
#screen .status-offline{color:#aeb8c0;background:#49535d55;border-color:#77818b66}
#screen .social-player-info>.status-badge{margin-top:5px}
#screen #playerList .social-player-info>.status-badge+.status-badge{margin-left:5px}
#screen .identity-name,#screen.portrait .topbar .identity-name{min-width:0;flex:0 1 auto}
#screen .topbar .identity,#screen .profile-header-identity,#screen #overlay .profile-identity{justify-content:flex-start;gap:7px}
#screen .profile-header-name,#screen #overlay .profile-identity h2{flex:0 1 auto;margin:0;min-width:0;width:auto}
#screen #overlay:is([data-drawer=player],[data-drawer=duel-profile]) .profile-stat-grid{grid-template-columns:repeat(6,minmax(0,1fr));gap:8px}
#screen #overlay:is([data-drawer=player],[data-drawer=duel-profile]) .profile-stat-grid>div{grid-column:span 2;min-height:0;height:66px;padding:8px}
#screen #overlay:is([data-drawer=player],[data-drawer=duel-profile]) .profile-stat-grid .match-stat{grid-column:span 3}
#screen #overlay:is([data-drawer=player],[data-drawer=duel-profile]) .profile-stat-grid b{font-size:24px;line-height:28px;margin-top:4px}
#screen #overlay:is([data-drawer=player],[data-drawer=duel-profile]) .profile-stat-grid .match-stat b{margin:0}
#screen #overlay:is([data-drawer=player],[data-drawer=duel-profile]) .dialog-body{flex:0 0 auto}
#screen #overlay:is([data-drawer=player],[data-drawer=duel-profile]) .player-tab-content{height:auto;max-height:none;overflow:visible}
#screen.portrait #overlay:is([data-drawer=player],[data-drawer=duel-profile]) .profile-stat-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
#screen.portrait #overlay:is([data-drawer=player],[data-drawer=duel-profile]) .profile-stat-grid>div,#screen.portrait #overlay:is([data-drawer=player],[data-drawer=duel-profile]) .profile-stat-grid .match-stat{grid-column:span 1;height:78px}
#screen.portrait #overlay:is([data-drawer=player],[data-drawer=duel-profile]) .dialog-head{flex-wrap:wrap;gap:10px}
#screen.portrait #overlay:is([data-drawer=player],[data-drawer=duel-profile]) .profile-identity{flex:1 0 100%;width:100%}
#screen.portrait #overlay:is([data-drawer=player],[data-drawer=duel-profile]) .profile-identity h2{max-width:none;overflow:visible;white-space:nowrap}
#screen.portrait #overlay:is([data-drawer=player],[data-drawer=duel-profile]) .profile-relationship-actions{margin-left:auto}
#screen.portrait #overlay:is([data-drawer=player],[data-drawer=duel-profile]) .dialog-footer .player-actions{display:flex;justify-content:center}
/* In-game controls share one translucent material. */
#screen .match-quick-chat>div{padding:4px 0;gap:0;overflow:hidden;min-width:180px}
#screen .match-quick-chat>div>button{display:block;width:100%;min-width:0;margin:0;padding:10px 16px;min-height:40px;border:0;border-radius:0;background:transparent;box-shadow:none;text-align:left}
#screen .match-quick-chat>div>button+button{border-top:1px solid #ffffff12}
#screen .match-quick-chat>div>button:hover{background:#ffffff0b}
#screen .signal-bars{width:22px;height:22px;gap:2px;transform:none}
#screen .signal-bars i{width:4px;height:6px}
#screen .signal-bars i:nth-child(2){height:11px}
#screen .signal-bars i:nth-child(3){height:16px}
#screen .signal-bars i:nth-child(4){height:22px}
#screen .online-game-top .network-control .network{width:40px;height:40px;padding:0;display:flex;align-items:center;justify-content:center}
#screen .existing-control:not(.existing-tip):not(.existing-power),#screen .game-menu>summary,#screen .match-quick-chat>summary,#screen .online-game-actions>button{background:#0005;border:1px solid #ffffff38;box-shadow:none;color:#fff;border-radius:6px}
#screen .existing-control:not(.existing-tip):not(.existing-power)>button,#screen .existing-control summary{background:transparent;border:0;box-shadow:none}
#screen .existing-views button{background:transparent;border:0;box-shadow:none}
#screen .existing-views button+button{border-left:1px solid #ffffff26}
#screen .existing-views button.active{background:#3d885b66;color:#fff}
#screen #overlay:is([data-drawer=online],[data-drawer=online-empty],[data-drawer=invite-player]) .chat-panel{width:350px}
#screen #playerList .social-player-row{gap:9px}
#screen #playerList .social-player-row>button:last-child{width:64px;min-width:64px}
#screen .social-name-line{gap:5px}
/* Opening sequence: soften the scene, slide players inward, settle the countdown. */
#screen .match-found-overlay{display:flex;align-items:center;justify-content:center;animation:opening-wash .45s ease-out both}
#screen .match-found-center{position:relative;inset:auto;margin:auto;width:min(680px,90%);gap:16px}
#screen .match-found-pair{width:100%;padding:8px 0}
#screen .match-found-person:first-child{animation:opening-left .65s cubic-bezier(.2,.8,.2,1) both}
#screen .match-found-person:last-child{animation:opening-right .65s cubic-bezier(.2,.8,.2,1) both}
#screen .match-found-vs{animation:opening-vs .5s .15s ease-out both}
#screen .match-countdown{font-size:42px;font-weight:700;line-height:1.2}
@keyframes opening-wash{from{opacity:0}to{opacity:1}}
@keyframes opening-left{from{opacity:0;transform:translateX(-70px)}to{opacity:1;transform:translateX(0)}}
@keyframes opening-right{from{opacity:0;transform:translateX(70px)}to{opacity:1;transform:translateX(0)}}
@keyframes opening-vs{from{opacity:0;transform:scale(.8)}to{opacity:1;transform:scale(1)}}
@media(prefers-reduced-motion:reduce){#screen .match-found-overlay,#screen .match-found-person,#screen .match-found-vs{animation:none}}
/* Broadcast scoreboard: adjoining player / score / player segments. */
#screen .scoreboard-main{height:36px;grid-template-columns:minmax(0,1fr) 198px minmax(0,1fr)}
#screen .scoreboard-main>.scoreboard-player,#screen .scoreboard-main>.central-score{height:36px;min-height:36px;border:1px solid #111;border-radius:0}
#screen .scoreboard-main>.scoreboard-player{background:linear-gradient(90deg,#ffda19 0%,#ffdf30 62%,#fff1a3 100%);color:#17201e;padding:0 8px}
#screen .scoreboard-main>.scoreboard-player.current{background:linear-gradient(90deg,#ffda19 0%,#ffdf30 62%,#fff1a3 100%)}
#screen .scoreboard-identity{box-shadow:none;color:#17201e!important}
#screen .scoreboard-identity strong{color:#17201e;font-size:18px;font-weight:700}
#screen .scoreboard-main>.central-score{background:#fff;grid-template-columns:50px minmax(0,1fr) 50px;color:#111}
#screen .central-score .frame-points{background:#fff;color:#111;font-size:21px;font-weight:400;line-height:34px}
#screen .central-score .frame-tally{height:34px;background:#008e87;color:#e9f4f2;border:0;border-left:1px solid #122e2b;border-right:1px solid #122e2b;gap:8px;font-size:18px}
#screen .player-clock{background:transparent;border:0;border-radius:0;padding:0 3px;color:#111;font-variant-numeric:tabular-nums}
#screen .player-turn-arrow{color:#17201e;font-size:21px}
#screen .scoreboard-player .avatar{border-radius:50%;margin:0;width:27px;height:27px}
#screen .floating-break{bottom:100%;height:28px;border:1px solid #17201e;background:#fff;color:#111;border-radius:0;padding:2px 9px}
#screen .floating-break .break-label{color:#17201e}
#screen.portrait .scoreboard-main{grid-template-columns:minmax(0,1fr) 166px minmax(0,1fr)}
#screen.portrait .scoreboard-main>.central-score{grid-template-columns:36px minmax(0,1fr) 36px}
#screen.portrait .scoreboard-identity strong{font-size:12px}
#screen.portrait .central-score .frame-tally{font-size:14px;gap:5px}
#screen.portrait .player-clock{font-size:11px;padding:2px}
#screen.portrait .player-turn-arrow{font-size:15px}

/* Broadcast typography: names bold, all scores regular; mirrored yellow panels. */
#screen .scoreboard-main{font-family:Arial,"Helvetica Neue","PingFang SC","Microsoft YaHei",sans-serif}
#screen .scoreboard-main>.scoreboard-player.opponent{background:linear-gradient(270deg,#ffda19 0%,#ffdf30 62%,#fff1a3 100%)}
#screen .central-score .frame-tally b{font-weight:400}
#screen .scoreboard-identity{height:34px}
#screen .player-clock{font-size:16px;box-shadow:none}
#screen.portrait .player-clock{font-size:11px;padding:0 2px}

/* Player dossier: quieter surfaces and a stable two-tab viewport. */
#screen #overlay:is([data-drawer=player],[data-drawer=duel-profile]) .player-tab-content{height:240px;min-height:240px;max-height:240px;overflow:hidden}
#screen #overlay:is([data-drawer=player],[data-drawer=duel-profile]) .profile-stat-grid{height:100%;grid-template-rows:64px 80px 80px;gap:8px}
#screen #overlay:is([data-drawer=player],[data-drawer=duel-profile]) .profile-stat-grid>div{height:auto;min-height:0;padding:12px 18px;border:0;border-radius:6px;background:#ffffff0c;box-shadow:none;display:flex;flex-direction:column;justify-content:center;gap:5px}
#screen #overlay:is([data-drawer=player],[data-drawer=duel-profile]) .profile-stat-grid small{font-size:12px;line-height:18px;color:#9cabb1;font-weight:400;letter-spacing:.3px}
#screen #overlay:is([data-drawer=player],[data-drawer=duel-profile]) .profile-stat-grid b{font-size:28px;line-height:32px;margin:0;font-weight:600;color:#f2f6f4;font-variant-numeric:tabular-nums}
#screen #overlay:is([data-drawer=player],[data-drawer=duel-profile]) .profile-stat-grid .match-stat{gap:3px}
#screen #overlay:is([data-drawer=player],[data-drawer=duel-profile]) .match-stat>div{margin:0;flex-direction:row;justify-content:flex-start;gap:24px}
#screen #overlay:is([data-drawer=player],[data-drawer=duel-profile]) .match-stat span{gap:7px;font-size:12px;color:#aab8bd;justify-content:flex-start}
#screen #overlay:is([data-drawer=player],[data-drawer=duel-profile]) .match-stat span b{font-size:22px;line-height:26px;color:#e8f1ec}
#screen #overlay:is([data-drawer=player],[data-drawer=duel-profile]) .match-stat span:last-child b{color:#77d4a3}
#screen #overlay:is([data-drawer=player],[data-drawer=duel-profile]) .player-profile-tabs{margin-bottom:12px}
#screen #overlay:is([data-drawer=player],[data-drawer=duel-profile]) .player-profile-tabs>button{background:#ffffff04;border-color:#ffffff18;font-size:14px;min-height:36px;height:36px}
#screen #overlay:is([data-drawer=player],[data-drawer=duel-profile]) .player-profile-tabs>button.active{background:#29764d38;color:#95e4b5;border-color:#53a67966;box-shadow:inset 0 -2px #62bd8c}
#screen .player-tab-content .honor-cabinet{height:100%;align-content:center}
#screen .honor-empty{height:100%;min-height:160px;display:grid;place-items:center;color:#8c9d9f;font-size:14px}
#screen.portrait #overlay:is([data-drawer=player],[data-drawer=duel-profile]) .player-tab-content{height:344px;min-height:344px;max-height:344px}
#screen.portrait #overlay:is([data-drawer=player],[data-drawer=duel-profile]) .profile-stat-grid{grid-template-rows:68px repeat(3,84px)}
#screen.portrait #overlay:is([data-drawer=player],[data-drawer=duel-profile]) .profile-stat-grid>div{height:auto;padding:10px 14px}
#screen.portrait #overlay:is([data-drawer=player],[data-drawer=duel-profile]) .match-stat>div{gap:16px}

/* Table events float below the header; fixed scoring remains undisturbed. */
#screen .online-game-top>.table-system-message{position:absolute;top:calc(100% + 10px);left:50%;transform:translateX(-50%);margin:0;width:max-content;max-width:calc(100% - 40px);max-height:none;padding:10px 20px;border:1px solid #ffffff26;border-radius:10px;background:#101915e6;box-shadow:0 5px 18px #0004;color:#f3f8f5;text-align:center;pointer-events:none;overflow:visible;z-index:12;animation:table-message-toast 3.5s both}
#screen .online-game-top>.table-system-message.persistent{animation:table-message-enter .25s both}
@keyframes table-message-enter{from{opacity:0;transform:translate(-50%,-14px)}to{opacity:1;transform:translate(-50%,0)}}
@keyframes table-message-toast{0%{opacity:0;transform:translate(-50%,-14px)}8%,90%{opacity:1;transform:translate(-50%,0)}100%{opacity:0;transform:translate(-50%,-14px)}}
#screen .duel-scoreboard{opacity:.8}
#screen .break-ball{border:0;box-shadow:none;background:var(--ball-color)}
#screen .break-ball[aria-label^="\u9EC4\u7403"]{color:#111}
#screen .table-decision,#screen.portrait .table-decision{bottom:40.8px;background:#10191599;border-color:#ffffff30!important;box-shadow:none}
#screen .table-decision-buttons.color-ball-buttons>button,#screen .table-decision-buttons.color-ball-buttons>button:hover{background:transparent!important;border:0!important;box-shadow:none;border-radius:0}
#screen .table-decision .nomination-ball{background:var(--ball-color)!important;box-shadow:none!important;border:0!important;border-radius:50%}
#screen .table-decision .nomination-ball::before,#screen .table-decision .nomination-ball::after{display:none}
@media(prefers-reduced-motion:reduce){#screen .online-game-top>.table-system-message{animation:none}}

/* Match result title shares the centered axis of players, score and actions. */
#screen #overlay[data-drawer="match-settlement"] .dialog-head{justify-content:center;text-align:center}
#screen #overlay[data-drawer="match-settlement"] .dialog-head h2{width:100%;margin:0;text-align:center}
#screen .friendly-rematch-status{min-height:1.5em;margin:0 0 6px;text-align:center;color:#c6cdd5;font-size:14px}

/* Event bubbles are out of flow; the action cluster always stays at the right edge. */
#screen .online-game-actions{margin-left:auto;flex:0 0 auto}
#screen .online-game-status{flex:1 1 auto;min-width:0}
#screen .fps-readout,#screen .online-game-status strong.match-playing,#screen .online-game-status .target-label{font-size:12px;font-weight:500;line-height:20px;color:#d7e5df;white-space:nowrap;font-variant-numeric:tabular-nums}
#screen #game>.fps-readout{position:absolute;top:22px;right:68px;z-index:7;text-shadow:0 1px 3px #000}
#screen.portrait .online-game-actions{gap:4px}
#screen.portrait .fps-readout,#screen.portrait .online-game-status strong.match-playing,#screen.portrait .online-game-status .target-label{font-size:11px}

/* Compact social roster and individually illustrated venue cards. */
#screen #playerList .social-player-row{min-height:62px;padding:7px 0;gap:10px}
#screen #playerList .social-avatar{width:38px;height:38px;min-width:38px;min-height:38px;flex-basis:38px}
#screen #playerList .social-player-info>.status-badge{margin-top:2px;line-height:16px;font-size:10px;padding:0 5px}
#screen #playerList .social-name-line button{font-size:14px;line-height:20px;min-height:20px;padding:0}
#screen .ranked-field:nth-child(n){background-image:linear-gradient(90deg,#071310bb,transparent 80%),var(--venue-art);background-size:cover;background-position:center;border:1px solid #a7c2ae66;border-radius:12px;padding:20px 24px;text-align:left;align-items:flex-start;justify-content:flex-end;gap:7px;box-shadow:0 6px 18px #0005,inset 0 0 0 3px #ffffff05}
#screen .ranked-field:nth-child(2){border-color:#829fc666}
#screen .ranked-field:nth-child(3){border-color:#bc8b9866}
#screen .ranked-field:nth-child(4){border-color:#d5b57588}
#screen .ranked-field .ui-icon{display:none}
#screen .ranked-field .field-edition{font:600 9px/1.4 Arial,sans-serif;letter-spacing:2px;color:#b9d2c0}
#screen .ranked-field strong{font-size:36px;line-height:1.15;letter-spacing:3px;font-weight:900;color:#effff3;text-shadow:0 2px 0 #19382a,0 4px 7px #0009;margin:0 0 5px;font-style:italic}
#screen .ranked-field:nth-child(2) strong{color:#e3efff;text-shadow:0 2px 0 #203c65,0 4px 7px #0009}
#screen .ranked-field:nth-child(3) strong{color:#fff1ed;text-shadow:0 2px 0 #603037,0 4px 7px #0009}
#screen .ranked-field:nth-child(4) strong{color:#ffe5a1;text-shadow:0 2px 0 #594318,0 4px 7px #0009}
#screen .ranked-field strong em{font-size:.6em;font-style:normal;letter-spacing:0;margin-left:5px}
#screen .ranked-field .field-stake{font-size:15px;position:relative;z-index:1}
#screen .ranked-field .field-conditions{font-size:12px;color:#d7e0db}
#screen.portrait .ranked-field:nth-child(n){padding:16px 14px;background-position:85% center}
#screen.portrait .ranked-field strong{font-size:30px}
#screen.portrait .ranked-field .field-edition{font-size:8px;letter-spacing:1px}

/* In-match choices and player-owned chat follow shared component colors. */
#screen .match-quick-chat>div{width:max-content;min-width:0;max-width:240px}
#screen .match-quick-chat>div>button{white-space:nowrap}
#screen #overlay:is([data-drawer=player],[data-drawer=duel-profile]) .player-profile-tabs>button.active{background:#168449;border-color:#49ad76;color:#fff;box-shadow:none}
#screen .table-decision,#screen.portrait .table-decision{background:rgba(9,22,30,.4);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);border-radius:12px;box-shadow:0 4px 16px #0002}
#screen .table-decision-buttons:not(.color-ball-buttons)>button{background:#0005;border:1px solid #ffffff38;color:#fff;box-shadow:none}
#screen .table-decision-buttons:not(.color-ball-buttons)>button.primary{background:#168449;border-color:#49ad76}
#screen .selected-ball-marker{position:absolute;z-index:6;bottom:36px;left:50%;transform:translateX(-50%);width:44px;min-width:44px;height:32px;min-height:32px;padding:4px 10px;border:1px solid #ffffff30;border-radius:6px 6px 0 0;background:#0007;display:flex;justify-content:center;align-items:center}
#screen .selected-ball-marker span{display:block;width:22px;height:22px;border-radius:50%;box-shadow:0 0 0 1px #ffffff50}
#screen .player-chat-bubble{position:absolute;bottom:calc(100% + 38px);left:8px;z-index:15;max-width:calc(100% - 16px);padding:10px 16px;background:#fff8e8;color:#18211c;border-radius:12px;box-shadow:0 4px 12px #0005;font-size:15px;font-weight:500;line-height:1.4;animation:player-chat-in .2s ease-out}
#screen .scoreboard-player.opponent .player-chat-bubble{left:auto;right:8px}
#screen .player-chat-bubble:after{content:'';position:absolute;top:100%;left:12px;border:8px solid transparent;border-top-color:#fff8e8;border-bottom:0}
#screen .scoreboard-player.opponent .player-chat-bubble:after{left:auto;right:12px}
@keyframes player-chat-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@media(prefers-reduced-motion:reduce){#screen .player-chat-bubble{animation:none}}

#screen .leaderboard-page>.page-header{flex-wrap:nowrap;gap:16px}
#screen .leaderboard-page>.page-header>.board-segments{flex:1;min-width:0;margin:0}
#screen .leaderboard-page>.page-content{min-height:0;overflow:hidden}
#screen .season-result-content{height:100%;min-height:0;display:flex;flex-direction:column;gap:16px}
#screen .page-content:has(>.season-result-content){overflow:hidden}
#screen .season-result-summary{flex:none}
#screen .season-result-summary h2{margin:8px 0;color:#a0e5ba}
#screen .season-snapshot-scroll{flex:1;min-height:0;overflow-y:auto;scrollbar-width:thin;scrollbar-color:#79918a #ffffff0a}
#screen .season-snapshot-scroll thead{position:sticky;top:0;background:#15201b;z-index:1}
#screen .season-snapshot-scroll .snapshot-self{background:#16844930}
#screen.portrait .leaderboard-page>.page-header{gap:8px}
#screen.portrait .leaderboard-page>.page-header>.board-segments>button{padding:8px 5px;font-size:14px;min-width:0}

#screen .table-decision-buttons:not(.color-ball-buttons)>button{background:#168449;border-color:#49ad76;color:#fff}
#screen .table-decision .nomination-ball{width:32px;height:32px;object-fit:cover;background:transparent!important;border-radius:50%}
#screen .selected-ball-marker img{width:26px;height:26px;object-fit:cover;border-radius:50%}
#screen .player-chat-bubble{bottom:calc(100% + 8px)}
#screen .table-decision .nomination-ball,#screen .selected-ball-marker img{clip-path:circle(36% at 50% 50%);transform:scale(1.35);border-radius:0}
/* Unified navigation, account settings and records \u2014 2026-10-10 */
#screen .page-header .page-back-icon,#screen button.danger[data-value="concede"]{background:#ae303b;border:1px solid #df6771;color:#fff}
#screen .ranked-field:nth-child(n){background-image:linear-gradient(#07100b42,#07100b99),var(--venue-art);background-position:center;background-size:cover;align-items:center;justify-content:center;text-align:center;gap:6px}
#screen .board-table th:first-child,#screen .board-table td:first-child{text-align:center;padding-left:8px;padding-right:8px}
#screen .rank-number,#screen .rank-medal{display:inline-flex;width:40px;justify-content:center;align-items:center;vertical-align:middle}
#screen .board-player{display:inline-flex;align-items:center;gap:8px;text-align:left;white-space:normal}
#screen .board-avatar{width:30px;height:30px;border-radius:50%;flex-shrink:0}
#screen .profile-sidebar{display:flex;flex-direction:column;min-height:0;background:#0003}
#screen .profile-sidebar .profile-tabs{flex:0 0 auto;width:100%}
#screen .profile-account-actions{margin-top:auto;display:flex;flex-direction:column;gap:8px;padding:12px;align-items:center}
#screen .game-settings-panel>.row{height:64px;min-height:64px;margin:0;padding:10px 4px;box-sizing:border-box;display:flex;align-items:center;justify-content:space-between}
#screen .personal-details{display:flex;flex-direction:column;gap:20px;max-width:650px;margin:auto}
#screen .personal-detail-row{display:flex;flex-direction:column;gap:10px}
#screen .personal-avatar-upload{width:64px;height:64px;border-radius:50%;overflow:hidden;position:relative;cursor:pointer;border:1px solid #ffffff55}
#screen .personal-avatar-upload img{width:100%;height:100%;object-fit:cover}
#screen .personal-avatar-upload input{position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:pointer}
#screen .personal-nickname{display:flex;align-items:center;gap:16px;flex-wrap:wrap}
#screen .personal-nickname input{width:220px;max-width:100%}
#screen .personal-nickname .actions{margin:0;gap:8px}
#screen .records-page>.page-header{gap:16px;justify-content:flex-start}
#screen .records-page .board-segments{flex:0 1 auto}
#screen .record-day h2{font-size:14px;font-weight:500;color:#bac9c1;margin:16px 0 8px}
#screen .record-entry{display:grid;grid-template-columns:48px 80px 42px minmax(180px,1fr) 96px;align-items:center;gap:12px;padding:12px;background:#0003;border-radius:8px;margin-bottom:8px;font-size:14px}
#screen .record-matchup{display:flex;align-items:center;justify-content:center;gap:14px;min-width:0}
#screen .record-matchup span{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#screen .record-matchup span:first-child{text-align:right}
#screen .record-matchup b{font-size:21px;white-space:nowrap;color:#f4dfad}
#screen .record-outcome.win{color:#78d9a1}#screen .record-outcome.loss{color:#ee9296}
#screen.portrait .record-entry{grid-template-columns:48px 1fr 42px 96px;gap:8px}
#screen.portrait .record-matchup{grid-row:2;grid-column:1/4}
#screen.portrait .record-replay{grid-column:4;grid-row:1/3}
#screen.portrait .profile-account-actions{padding:8px 4px}
#screen .page-header .page-back-icon{background:#ae303b!important;color:#fff!important;border-color:#df6771!important}
#screen button.danger[data-value="concede"]{background:#ae303b!important;color:#fff!important;border-color:#df6771!important}
#screen .records-page>.page-header .board-segments>button{width:96px;min-width:96px;padding:8px 12px;white-space:nowrap;flex:0 0 96px}
#screen.portrait .records-page>.page-header{gap:10px;padding-left:12px;padding-right:12px}
#screen.portrait .records-page>.page-header .board-segments>button{width:auto;min-width:0;flex:1;padding:8px 10px}
/* Equipment density and distinct replay control layouts */
#screen .wallet-display{display:flex;align-items:center;justify-content:center;padding:0 18px;flex:0 0 auto;cursor:default}
#screen .duel-replay .replay-rail{right:12px;width:48px;align-items:flex-end}
#screen .duel-replay .replay-rail>button,#screen .duel-replay .replay-rail summary{border:1px solid #ffffff38;border-radius:5px;background:#0005;box-shadow:none}
#screen .training-replay>.fullscreen-button{position:absolute;right:12px;top:8px}
#screen .training-replay-footer{position:absolute;bottom:8px;left:12px;right:12px;display:flex;align-items:center;gap:5px;z-index:8}
#screen .training-replay-footer>button{width:auto;min-width:0;flex:1;height:40px;min-height:40px;padding:4px;border:1px solid #ffffff38;border-radius:5px;background:#0005;color:#fff;font-size:12px}
#screen .training-replay-footer>button.active{background:#168449b3}
#screen .training-replay-footer .replay-icon svg{width:20px;height:20px}
#screen .training-replay-meta{display:flex;gap:5px;align-items:center;font-size:12px;white-space:nowrap}
#screen .training-replay-meta>span{padding:10px 6px;background:#0005;border:1px solid #ffffff38;border-radius:5px}
#screen.portrait .training-replay-footer{flex-wrap:wrap}
#screen.portrait .training-replay-meta{flex-basis:100%}
#screen .gear-grid{grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
#screen .gear-grid:not(.gear-long-grid) .gear-card{aspect-ratio:1;gap:4px;padding:8px;justify-content:space-between}
#screen .gear-grid:not(.gear-long-grid) .gear-preview{flex:1;min-height:0;gap:4px}
#screen .gear-grid:not(.gear-long-grid) .gear-art{height:52px;min-height:0;flex:1;object-fit:contain}
#screen .gear-grid:not(.gear-long-grid) .gear-name-line{flex-wrap:wrap;justify-content:center;gap:4px;font-size:12px}
#screen .gear-grid:not(.gear-long-grid) .gear-card-state{font-size:12px;min-height:18px}
#screen .gear-grid:not(.gear-long-grid) .gear-card-actions{display:flex;flex-direction:row;width:100%;gap:4px;margin:0}
#screen .gear-grid:not(.gear-long-grid) .gear-card-actions>button{height:32px;min-height:32px;font-size:12px;min-width:0;padding:2px 4px;flex:1}
#screen .gear-long-grid{grid-template-columns:1fr;gap:8px}
#screen .gear-long-grid .gear-card{display:flex;flex-direction:column;align-items:stretch;height:98px;min-height:98px;padding:6px 12px;gap:2px}
#screen .gear-long-heading{display:flex;align-items:center;gap:12px;min-height:36px}
#screen .gear-long-heading .gear-name-button{flex:1;min-width:0;min-height:32px;height:32px;padding:0;background:transparent;border:0;box-shadow:none;text-align:left}
#screen .gear-long-heading .gear-name-line{justify-content:flex-start;gap:8px;white-space:nowrap;font-size:14px}
#screen .gear-long-heading .gear-card-state{font-size:13px;white-space:nowrap}
#screen .gear-long-heading .gear-card-actions{display:flex;flex-direction:row;gap:6px;margin:0;flex-shrink:0}
#screen .gear-long-heading .gear-card-actions>button{width:64px;min-width:64px;height:32px;min-height:32px;padding:0 4px;font-size:12px}
#screen .gear-long-grid .gear-preview{flex:1;min-height:0}
#screen .gear-long-grid .gear-art{height:48px;width:100%;object-fit:contain}
#screen.portrait .gear-grid:not(.gear-long-grid){grid-template-columns:repeat(2,minmax(0,1fr))}
#screen.portrait .gear-long-heading{flex-wrap:wrap;gap:4px}
#screen.portrait .gear-long-heading .gear-name-button{flex-basis:100%}
#screen.portrait .gear-long-grid .gear-card{height:136px;min-height:136px}
#screen.portrait .gear-long-heading .gear-card-actions{margin-left:auto}
#screen .gear-long-heading .gear-card-actions{width:auto;flex:0 0 auto}
#screen .gear-long-heading .gear-card-actions>button.standard-action{flex:0 0 64px;width:64px}
#screen .gear-long-heading .gear-name-button{width:auto;flex:1 1 auto}
#screen .gear-long-heading .gear-name-line{display:flex;flex-direction:row;flex-wrap:nowrap}
#screen .gear-long-grid .gear-art{object-fit:cover;object-position:center}
#screen .duel-replay .replay-rail{right:8px}
/* Flat player-level illustrations and per-message reading state */
#screen .ranked-field:nth-child(n){background-image:linear-gradient(#07100b18,#07100b55),var(--venue-art)}
#screen .message-card[data-message-id]{position:relative;padding-top:28px}
#screen .message-read-state{position:absolute;right:14px;top:9px;font-size:11px;color:#b5c0c8;line-height:1}
#screen .message-card.message-unread{background:#171f26;border-color:#ffffff14;box-shadow:none}
#screen .message-unread .message-copy strong{color:#aab6be}
#screen .message-unread .message-copy :is(p,small){color:#919fa9}
#screen .message-card.message-read{background:#24312e;border-color:#ffffff2b}
#screen .message-read .message-copy strong{color:#f3f7f5}
#screen .message-read .message-copy :is(p,small){color:#c3d0c9}
#screen .profile-layout{position:relative;padding-bottom:56px;box-sizing:border-box}
#screen .profile-account-actions,#screen.portrait .profile-account-actions{position:absolute;bottom:0;left:0;display:flex;flex-direction:row;gap:8px;padding:4px 0;width:auto;margin:0}
#screen .profile-account-actions>button{width:96px;min-width:96px;flex:0 0 96px}
/* Reserve the left portrait; center all venue copy in the right text area. */
#screen .ranked-field:nth-child(n){padding-left:38%;padding-right:5%}
#screen .ranked-field .field-edition{white-space:nowrap;letter-spacing:1.2px}
#screen.portrait .ranked-field:nth-child(n){padding-left:32%;padding-right:4%}
#screen.portrait .ranked-field .field-edition{font-size:7px;letter-spacing:.3px}
#screen.portrait .ranked-field strong{font-size:26px;letter-spacing:1px;white-space:nowrap}
#screen.portrait .ranked-field .field-stake{font-size:12px;white-space:nowrap}
#screen .ranked-field:nth-child(n),#screen.portrait .ranked-field:nth-child(n){padding:16px 18px}
#screen .ranked-field>:not(.venue-frame){width:62%;align-self:flex-end;text-align:center;box-sizing:border-box}
#screen .ranked-field .field-stake{justify-content:center}
#screen.portrait .ranked-field:nth-child(n){padding:12px 8px}
#screen.portrait .ranked-field>:not(.venue-frame){width:65%}
/* Keep hair and faces inside the visible card when cover crops vertical overflow. */
#screen .ranked-field:nth-child(n),#screen.portrait .ranked-field:nth-child(n){background-position:center top}
/* Unified wide art and identical crop policy for all four venues. */
#screen .ranked-field:nth-child(n),#screen.portrait .ranked-field:nth-child(n){background-image:linear-gradient(#07100b18,#07100b55),var(--venue-art);background-size:cover;background-position:center top;background-repeat:no-repeat}

/* Flat venue emblems: centered information, no portrait art or extra frame. */
#screen .ranked-field:nth-child(n),#screen.portrait .ranked-field:nth-child(n){background-image:var(--venue-art);background-size:cover;background-position:center;background-repeat:no-repeat;padding:14px 16px;align-items:center;justify-content:center;gap:6px;box-shadow:0 5px 16px #0003;border:1px solid #ffffff24}
#screen .ranked-field>:not(.venue-frame),#screen.portrait .ranked-field>:not(.venue-frame){width:auto;align-self:center;text-align:center}
#screen .ranked-field .field-edition,#screen.portrait .ranked-field .field-edition{font-size:9px;letter-spacing:1.8px;color:#ffffff80}
#screen .ranked-field strong,#screen.portrait .ranked-field strong{font-size:30px;line-height:1.15;letter-spacing:2px;font-style:normal;text-shadow:none;margin:0;color:#f5f7f4}
#screen .ranked-field strong em{font-size:1em;margin-left:0;letter-spacing:2px}
#screen .ranked-field .field-stake,#screen.portrait .ranked-field .field-stake{gap:12px;line-height:1.15}
#screen .ranked-field .stake-label,#screen .ranked-field .field-conditions,#screen.portrait .ranked-field .field-conditions{font-size:22px;line-height:1.3;color:#e3e8e4;font-weight:500}
#screen .ranked-field .coin-amount{font-size:40px;font-weight:750;line-height:1.1;color:#ffe3a0;font-variant-numeric:tabular-nums}
#screen .ranked-field .coin-icon{width:25px;height:25px}
#screen.portrait .ranked-field .stake-label,#screen.portrait .ranked-field .field-conditions{font-size:18px}
#screen.portrait .ranked-field .field-stake{gap:6px}
#screen.portrait .ranked-field .coin-amount{font-size:34px}
#screen.portrait .ranked-field .field-edition{font-size:7px;letter-spacing:.5px}

#screen .ranked-field:nth-child(n),#screen.portrait .ranked-field:nth-child(n){background-size:100% 100%}
#screen .ranked-field:nth-child(n) strong{color:#f5f7f4;text-shadow:none}
#screen .ranked-field:nth-child(1){background-color:#183e32}
#screen .ranked-field:nth-child(2){background-color:#17354b}
#screen .ranked-field:nth-child(3){background-color:#3d2945}
#screen .ranked-field:nth-child(4){background-color:#493821}

/* Generated flat line-art lobby modes, shared with the component guide. */
#screen .home .mode-nav button:nth-child(n),#screen .design-mode-samples>button:nth-child(n){border:1px solid #ffffff38;box-shadow:0 4px 12px #0003;text-shadow:0 2px 4px #0005;font-size:30px;font-weight:800;background:#173e31}
#screen .home .mode-nav button:nth-child(n):before,#screen .design-mode-samples>button:nth-child(n):before{filter:none;opacity:1;background-size:100% 100%;background-position:center}
#screen .home .mode-nav button:nth-child(1):before,#screen .design-mode-samples>button:nth-child(1):before{background-image:url('/assets/mode-lineart-practice.png')}
#screen .home .mode-nav button:nth-child(2):before,#screen .design-mode-samples>button:nth-child(2):before{background-image:url('/assets/mode-lineart-friend.png')}
#screen .home .mode-nav button:nth-child(3):before,#screen .design-mode-samples>button:nth-child(3):before{background-image:url('/assets/mode-lineart-ranked.png')}
#screen .home .mode-nav .mode-watermark,#screen .design-mode-samples .mode-watermark{display:none}

/* Seven daily challenges remain fully visible without modal scrolling. */
#screen #overlay[data-drawer=training-challenges] .dialog{width:540px}
#screen #overlay[data-drawer=training-challenges] .challenge-list{gap:6px}
#screen #overlay[data-drawer=training-challenges] .challenge-item{min-height:48px;padding:4px 12px}

/* 2026-10-13 user revision: readable frosted lobby, unified pressed feedback. */
#screen .topbar>.wallet-display{position:relative;padding-left:16px}
#screen .topbar>.wallet-display:before{content:'';position:absolute;left:0;top:11px;bottom:11px;width:1px;background:#ffffff38}
#screen .game-illustration-icon{width:27px;height:27px;object-fit:contain;margin-right:7px;filter:drop-shadow(0 2px 2px #0005)}
#screen button:not(:disabled):active:not([data-product-press="cancelled"]),#screen summary:active:not([data-product-press="cancelled"]),#screen [role=button]:active:not([data-product-press="cancelled"]),#screen [data-detail]:active:not([data-product-press="cancelled"]),#screen a:active:not([data-product-press="cancelled"]){filter:brightness(.65)}
#screen .profile-sidebar{position:relative;display:flex;flex-direction:column}
#screen .profile-account-actions,#screen.portrait .profile-account-actions{position:static;display:flex;flex-direction:column;align-items:stretch;width:100%;margin-top:auto;padding:12px 0;gap:8px}
#screen .profile-account-actions>button{width:100%;min-width:0;flex:none}
#screen .personal-avatar-edit{display:flex;align-items:center;gap:14px}
#screen .personal-avatar-edit img{width:64px;height:64px;border-radius:50%;object-fit:cover}
#screen .personal-avatar-edit input{display:none}
#screen .online-game-top{background:transparent!important;border:0!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;pointer-events:none!important}
#screen .online-game-top details,#screen .online-game-top button,#screen .online-game-top .network-popover{pointer-events:auto}
#screen #overlay[data-drawer=invite-player]{background:transparent;top:var(--drawer-top,50px);height:calc(100% - var(--drawer-top,50px));bottom:0}
#screen #overlay[data-drawer=invite-player] .dialog{height:100%;max-height:100%;top:0;bottom:0;background:#08110fdd;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)}
#screen .ranked-field .field-edition{font-family:Georgia,serif;font-size:12px!important;font-weight:700;font-style:italic;letter-spacing:1.4px!important;text-shadow:0 1px 1px #000,0 -1px 0 #ffffff50;color:#e5dbba!important}
#screen .ranked-field strong{font-family:'Songti SC','Noto Serif SC',serif!important;font-weight:900!important;letter-spacing:4px!important;color:#f4e7c5!important;-webkit-text-stroke:.3px #e6d6a1;text-shadow:0 2px 0 #706349,0 4px 5px #0008!important}

#screen .switch:active:not([data-product-press="cancelled"]),#screen input[type=range]:active:not([data-product-press="cancelled"]){filter:brightness(.65)}

/* Compact sidebar labels use the next type size; actions keep standard width. */
#screen .profile-layout,#screen .gear-layout,#screen.portrait .profile-layout,#screen.portrait .gear-layout{grid-template-columns:104px minmax(0,1fr);gap:16px}
#screen .profile-tabs,#screen .gear-categories,#screen.portrait .profile-tabs,#screen.portrait .gear-categories{padding-right:0}
#screen .profile-tabs>button,#screen .gear-categories>button,#screen.portrait .profile-tabs>button,#screen.portrait .gear-categories>button{font-size:16px;padding-left:12px;padding-right:12px;white-space:nowrap}
#screen .profile-account-actions{align-items:center}
#screen .profile-account-actions>button{width:96px;min-width:96px;max-width:96px;flex:none;font-size:14px}

#screen .actions>button:only-child:not(.danger):not(:disabled){background:#168449;border-color:#49ad76;color:#fff}

#screen .profile-load-state{height:100%;min-height:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;text-align:center;color:#b3bfcc}

/* Public equipped loadout: two long items, then two rows of three. */
#screen .player-equipment-grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));grid-template-rows:repeat(3,minmax(0,1fr));gap:8px;height:100%;min-height:0}
#screen .player-equipment-card{grid-column:span 2;min-width:0;min-height:0;padding:6px 10px;border:1px solid #ffffff18;border-radius:10px;background:#ffffff04;display:grid;grid-template-rows:auto minmax(0,1fr) auto;gap:2px}
#screen .player-equipment-card.long-equipment{grid-column:span 3}
#screen .player-equipment-heading{display:flex;align-items:center;justify-content:space-between;gap:6px;font-size:11px;color:#b3bfcc}
#screen .player-equipment-card img{width:100%;height:100%;min-height:0;object-fit:contain}
#screen .player-equipment-card strong{font-size:12px;font-weight:500;line-height:16px;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#screen .player-equipment-heading .gear-tier-tag{font-size:10px;padding:0 4px;line-height:14px}

/* Approved clear illustrated icons. Existing text buttons remain text. */
.game-icon{display:inline-block;width:22px;height:22px;flex:none;vertical-align:middle;background-repeat:no-repeat}
.icon-avatar{background-image:url(/assets/icons/clear-illustrated-atlas.png)!important;background-size:931.25% auto!important;background-position:0.986842% 7.094266%!important;background-repeat:no-repeat!important;-webkit-mask:none!important;mask:none!important}
.icon-coins{background-image:url(/assets/icons/clear-illustrated-atlas.png)!important;background-size:931.25% auto!important;background-position:14.990602% 7.094266%!important;background-repeat:no-repeat!important;-webkit-mask:none!important;mask:none!important}
.icon-equipment{background-image:url(/assets/icons/clear-illustrated-atlas.png)!important;background-size:931.25% auto!important;background-position:28.994361% 7.094266%!important;background-repeat:no-repeat!important;-webkit-mask:none!important;mask:none!important}
.icon-trophy{background-image:url(/assets/icons/clear-illustrated-atlas.png)!important;background-size:931.25% auto!important;background-position:42.998120% 7.094266%!important;background-repeat:no-repeat!important;-webkit-mask:none!important;mask:none!important}
.icon-records{background-image:url(/assets/icons/clear-illustrated-atlas.png)!important;background-size:931.25% auto!important;background-position:57.001880% 7.094266%!important;background-repeat:no-repeat!important;-webkit-mask:none!important;mask:none!important}
.icon-messages{background-image:url(/assets/icons/clear-illustrated-atlas.png)!important;background-size:931.25% auto!important;background-position:71.005639% 7.094266%!important;background-repeat:no-repeat!important;-webkit-mask:none!important;mask:none!important}
.icon-clock{background-image:url(/assets/icons/clear-illustrated-atlas.png)!important;background-size:931.25% auto!important;background-position:85.009398% 7.094266%!important;background-repeat:no-repeat!important;-webkit-mask:none!important;mask:none!important}
.icon-calendar{background-image:url(/assets/icons/clear-illustrated-atlas.png)!important;background-size:931.25% auto!important;background-position:99.013158% 7.094266%!important;background-repeat:no-repeat!important;-webkit-mask:none!important;mask:none!important}
.icon-target{background-image:url(/assets/icons/clear-illustrated-atlas.png)!important;background-size:931.25% auto!important;background-position:0.986842% 22.643343%!important;background-repeat:no-repeat!important;-webkit-mask:none!important;mask:none!important}
.icon-gift{background-image:url(/assets/icons/clear-illustrated-atlas.png)!important;background-size:931.25% auto!important;background-position:14.990602% 22.643343%!important;background-repeat:no-repeat!important;-webkit-mask:none!important;mask:none!important}
.icon-level{background-image:url(/assets/icons/clear-illustrated-atlas.png)!important;background-size:931.25% auto!important;background-position:28.994361% 22.643343%!important;background-repeat:no-repeat!important;-webkit-mask:none!important;mask:none!important}
.icon-star{background-image:url(/assets/icons/clear-illustrated-atlas.png)!important;background-size:931.25% auto!important;background-position:42.998120% 22.643343%!important;background-repeat:no-repeat!important;-webkit-mask:none!important;mask:none!important}
.icon-medal{background-image:url(/assets/icons/clear-illustrated-atlas.png)!important;background-size:931.25% auto!important;background-position:57.001880% 22.643343%!important;background-repeat:no-repeat!important;-webkit-mask:none!important;mask:none!important}
.icon-friends{background-image:url(/assets/icons/clear-illustrated-atlas.png)!important;background-size:931.25% auto!important;background-position:71.005639% 22.643343%!important;background-repeat:no-repeat!important;-webkit-mask:none!important;mask:none!important}
.icon-invite{background-image:url(/assets/icons/clear-illustrated-atlas.png)!important;background-size:931.25% auto!important;background-position:85.009398% 22.643343%!important;background-repeat:no-repeat!important;-webkit-mask:none!important;mask:none!important}
.icon-share{background-image:url(/assets/icons/clear-illustrated-atlas.png)!important;background-size:931.25% auto!important;background-position:99.013158% 22.643343%!important;background-repeat:no-repeat!important;-webkit-mask:none!important;mask:none!important}
.icon-spectate{background-image:url(/assets/icons/clear-illustrated-atlas.png)!important;background-size:931.25% auto!important;background-position:0.986842% 37.269193%!important;background-repeat:no-repeat!important;-webkit-mask:none!important;mask:none!important}
.icon-menu{background-image:url(/assets/icons/clear-illustrated-atlas.png)!important;background-size:931.25% auto!important;background-position:14.990602% 37.269193%!important;background-repeat:no-repeat!important;-webkit-mask:none!important;mask:none!important}
.icon-settings{background-image:url(/assets/icons/clear-illustrated-atlas.png)!important;background-size:931.25% auto!important;background-position:28.994361% 37.269193%!important;background-repeat:no-repeat!important;-webkit-mask:none!important;mask:none!important}
.icon-signal{background-image:url(/assets/icons/clear-illustrated-atlas.png)!important;background-size:931.25% auto!important;background-position:42.998120% 37.269193%!important;background-repeat:no-repeat!important;-webkit-mask:none!important;mask:none!important}
.icon-fullscreen{background-image:url(/assets/icons/clear-illustrated-atlas.png)!important;background-size:931.25% auto!important;background-position:57.001880% 37.269193%!important;background-repeat:no-repeat!important;-webkit-mask:none!important;mask:none!important}
.icon-back{background-image:url(/assets/icons/clear-illustrated-atlas.png)!important;background-size:931.25% auto!important;background-position:71.005639% 37.269193%!important;background-repeat:no-repeat!important;-webkit-mask:none!important;mask:none!important}
.icon-close{background-image:url(/assets/icons/clear-illustrated-atlas.png)!important;background-size:931.25% auto!important;background-position:85.009398% 37.269193%!important;background-repeat:no-repeat!important;-webkit-mask:none!important;mask:none!important}
.icon-check{background-image:url(/assets/icons/clear-illustrated-atlas.png)!important;background-size:931.25% auto!important;background-position:99.013158% 37.269193%!important;background-repeat:no-repeat!important;-webkit-mask:none!important;mask:none!important}
.icon-cancel{background-image:url(/assets/icons/clear-illustrated-atlas.png)!important;background-size:931.25% auto!important;background-position:0.986842% 51.846453%!important;background-repeat:no-repeat!important;-webkit-mask:none!important;mask:none!important}
.icon-edit{background-image:url(/assets/icons/clear-illustrated-atlas.png)!important;background-size:931.25% auto!important;background-position:14.990602% 51.846453%!important;background-repeat:no-repeat!important;-webkit-mask:none!important;mask:none!important}
.icon-upload{background-image:url(/assets/icons/clear-illustrated-atlas.png)!important;background-size:931.25% auto!important;background-position:28.994361% 51.846453%!important;background-repeat:no-repeat!important;-webkit-mask:none!important;mask:none!important}
.icon-block{background-image:url(/assets/icons/clear-illustrated-atlas.png)!important;background-size:931.25% auto!important;background-position:42.998120% 51.846453%!important;background-repeat:no-repeat!important;-webkit-mask:none!important;mask:none!important}
.icon-delete{background-image:url(/assets/icons/clear-illustrated-atlas.png)!important;background-size:931.25% auto!important;background-position:57.001880% 51.846453%!important;background-repeat:no-repeat!important;-webkit-mask:none!important;mask:none!important}
.icon-feedback{background-image:url(/assets/icons/clear-illustrated-atlas.png)!important;background-size:931.25% auto!important;background-position:71.005639% 51.846453%!important;background-repeat:no-repeat!important;-webkit-mask:none!important;mask:none!important}
.icon-logout{background-image:url(/assets/icons/clear-illustrated-atlas.png)!important;background-size:931.25% auto!important;background-position:85.009398% 51.846453%!important;background-repeat:no-repeat!important;-webkit-mask:none!important;mask:none!important}
.icon-login{background-image:url(/assets/icons/clear-illustrated-atlas.png)!important;background-size:931.25% auto!important;background-position:99.013158% 51.846453%!important;background-repeat:no-repeat!important;-webkit-mask:none!important;mask:none!important}
.icon-camera{background-image:url(/assets/icons/clear-illustrated-atlas.png)!important;background-size:931.25% auto!important;background-position:0.986842% 67.006803%!important;background-repeat:no-repeat!important;-webkit-mask:none!important;mask:none!important}
.icon-aim{background-image:url(/assets/icons/clear-illustrated-atlas.png)!important;background-size:931.25% auto!important;background-position:14.990602% 67.006803%!important;background-repeat:no-repeat!important;-webkit-mask:none!important;mask:none!important}
.icon-broadcast{background-image:url(/assets/icons/clear-illustrated-atlas.png)!important;background-size:931.25% auto!important;background-position:28.994361% 67.006803%!important;background-repeat:no-repeat!important;-webkit-mask:none!important;mask:none!important}
.icon-god{background-image:url(/assets/icons/clear-illustrated-atlas.png)!important;background-size:931.25% auto!important;background-position:42.998120% 67.006803%!important;background-repeat:no-repeat!important;-webkit-mask:none!important;mask:none!important}
.icon-prev{background-image:url(/assets/icons/clear-illustrated-atlas.png)!important;background-size:931.25% auto!important;background-position:57.001880% 67.006803%!important;background-repeat:no-repeat!important;-webkit-mask:none!important;mask:none!important}
.icon-play{background-image:url(/assets/icons/clear-illustrated-atlas.png)!important;background-size:931.25% auto!important;background-position:71.005639% 67.006803%!important;background-repeat:no-repeat!important;-webkit-mask:none!important;mask:none!important}
.icon-pause{background-image:url(/assets/icons/clear-illustrated-atlas.png)!important;background-size:931.25% auto!important;background-position:85.009398% 67.006803%!important;background-repeat:no-repeat!important;-webkit-mask:none!important;mask:none!important}
.icon-next{background-image:url(/assets/icons/clear-illustrated-atlas.png)!important;background-size:931.25% auto!important;background-position:99.013158% 67.006803%!important;background-repeat:no-repeat!important;-webkit-mask:none!important;mask:none!important}
.icon-replay{background-image:url(/assets/icons/clear-illustrated-atlas.png)!important;background-size:931.25% auto!important;background-position:0.986842% 80.903790%!important;background-repeat:no-repeat!important;-webkit-mask:none!important;mask:none!important}
.icon-reset{background-image:url(/assets/icons/clear-illustrated-atlas.png)!important;background-size:931.25% auto!important;background-position:14.990602% 80.903790%!important;background-repeat:no-repeat!important;-webkit-mask:none!important;mask:none!important}
.icon-undo{background-image:url(/assets/icons/clear-illustrated-atlas.png)!important;background-size:931.25% auto!important;background-position:28.994361% 80.903790%!important;background-repeat:no-repeat!important;-webkit-mask:none!important;mask:none!important}
.icon-free-placement{background-image:url(/assets/icons/clear-illustrated-atlas.png)!important;background-size:931.25% auto!important;background-position:42.998120% 80.903790%!important;background-repeat:no-repeat!important;-webkit-mask:none!important;mask:none!important}
.icon-sound{background-image:url(/assets/icons/clear-illustrated-atlas.png)!important;background-size:931.25% auto!important;background-position:57.001880% 80.903790%!important;background-repeat:no-repeat!important;-webkit-mask:none!important;mask:none!important}
.icon-language{background-image:url(/assets/icons/clear-illustrated-atlas.png)!important;background-size:931.25% auto!important;background-position:71.005639% 80.903790%!important;background-repeat:no-repeat!important;-webkit-mask:none!important;mask:none!important}
.icon-help{background-image:url(/assets/icons/clear-illustrated-atlas.png)!important;background-size:931.25% auto!important;background-position:85.009398% 80.903790%!important;background-repeat:no-repeat!important;-webkit-mask:none!important;mask:none!important}
.icon-notification{background-image:url(/assets/icons/clear-illustrated-atlas.png)!important;background-size:931.25% auto!important;background-position:99.013158% 80.903790%!important;background-repeat:no-repeat!important;-webkit-mask:none!important;mask:none!important}
.icon-cue{background-image:url(/assets/icons/clear-illustrated-atlas.png)!important;background-size:931.25% auto!important;background-position:0.986842% 95.092323%!important;background-repeat:no-repeat!important;-webkit-mask:none!important;mask:none!important}
.icon-case{background-image:url(/assets/icons/clear-illustrated-atlas.png)!important;background-size:931.25% auto!important;background-position:14.990602% 95.092323%!important;background-repeat:no-repeat!important;-webkit-mask:none!important;mask:none!important}
.icon-tip{background-image:url(/assets/icons/clear-illustrated-atlas.png)!important;background-size:931.25% auto!important;background-position:28.994361% 95.092323%!important;background-repeat:no-repeat!important;-webkit-mask:none!important;mask:none!important}
.icon-ferrule{background-image:url(/assets/icons/clear-illustrated-atlas.png)!important;background-size:931.25% auto!important;background-position:42.998120% 95.092323%!important;background-repeat:no-repeat!important;-webkit-mask:none!important;mask:none!important}
.icon-chalk{background-image:url(/assets/icons/clear-illustrated-atlas.png)!important;background-size:931.25% auto!important;background-position:57.001880% 95.092323%!important;background-repeat:no-repeat!important;-webkit-mask:none!important;mask:none!important}
.icon-extension{background-image:url(/assets/icons/clear-illustrated-atlas.png)!important;background-size:931.25% auto!important;background-position:71.005639% 95.092323%!important;background-repeat:no-repeat!important;-webkit-mask:none!important;mask:none!important}
.icon-cloth{background-image:url(/assets/icons/clear-illustrated-atlas.png)!important;background-size:931.25% auto!important;background-position:85.009398% 95.092323%!important;background-repeat:no-repeat!important;-webkit-mask:none!important;mask:none!important}
.icon-oil{background-image:url(/assets/icons/clear-illustrated-atlas.png)!important;background-size:931.25% auto!important;background-position:99.013158% 95.092323%!important;background-repeat:no-repeat!important;-webkit-mask:none!important;mask:none!important}
img.game-illustration-icon,img.coin-icon{content:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32'/%3E")}
img.game-illustration-icon[src$="game-briefcase.svg"]{background-image:url(/assets/icons/clear-illustrated-atlas.png)!important;background-size:931.25% auto!important;background-position:28.994361% 7.094266%!important;background-repeat:no-repeat!important;-webkit-mask:none!important;mask:none!important}
img.game-illustration-icon[data-icon="trophy"]{background-image:url(/assets/icons/clear-illustrated-atlas.png)!important;background-size:931.25% auto!important;background-position:42.998120% 7.094266%!important;background-repeat:no-repeat!important;-webkit-mask:none!important;mask:none!important}
img.game-illustration-icon[src$="game-clipboard-text.svg"]{background-image:url(/assets/icons/clear-illustrated-atlas.png)!important;background-size:931.25% auto!important;background-position:57.001880% 7.094266%!important;background-repeat:no-repeat!important;-webkit-mask:none!important;mask:none!important}
img.game-illustration-icon[src$="game-envelope-simple.svg"]{background-image:url(/assets/icons/clear-illustrated-atlas.png)!important;background-size:931.25% auto!important;background-position:71.005639% 7.094266%!important;background-repeat:no-repeat!important;-webkit-mask:none!important;mask:none!important}
img.coin-icon{background-image:url(/assets/icons/clear-illustrated-atlas.png)!important;background-size:931.25% auto!important;background-position:14.990602% 7.094266%!important;background-repeat:no-repeat!important;-webkit-mask:none!important;mask:none!important}
.ui-icon[style*="briefcase.svg"]{background-image:url(/assets/icons/clear-illustrated-atlas.png)!important;background-size:931.25% auto!important;background-position:28.994361% 7.094266%!important;background-repeat:no-repeat!important;-webkit-mask:none!important;mask:none!important}
.ui-icon[style*="trophy.svg"]{background-image:url(/assets/icons/clear-illustrated-atlas.png)!important;background-size:931.25% auto!important;background-position:42.998120% 7.094266%!important;background-repeat:no-repeat!important;-webkit-mask:none!important;mask:none!important}
.ui-icon[style*="clipboard-text.svg"]{background-image:url(/assets/icons/clear-illustrated-atlas.png)!important;background-size:931.25% auto!important;background-position:57.001880% 7.094266%!important;background-repeat:no-repeat!important;-webkit-mask:none!important;mask:none!important}
.ui-icon[style*="envelope-simple.svg"]{background-image:url(/assets/icons/clear-illustrated-atlas.png)!important;background-size:931.25% auto!important;background-position:71.005639% 7.094266%!important;background-repeat:no-repeat!important;-webkit-mask:none!important;mask:none!important}
.ui-icon[style*="coins.svg"]{background-image:url(/assets/icons/clear-illustrated-atlas.png)!important;background-size:931.25% auto!important;background-position:14.990602% 7.094266%!important;background-repeat:no-repeat!important;-webkit-mask:none!important;mask:none!important}
.ui-icon[style*="gift.svg"]{background-image:url(/assets/icons/clear-illustrated-atlas.png)!important;background-size:931.25% auto!important;background-position:14.990602% 22.643343%!important;background-repeat:no-repeat!important;-webkit-mask:none!important;mask:none!important}
.ui-icon[style*="clock.svg"]{background-image:url(/assets/icons/clear-illustrated-atlas.png)!important;background-size:931.25% auto!important;background-position:85.009398% 7.094266%!important;background-repeat:no-repeat!important;-webkit-mask:none!important;mask:none!important}
.ui-icon[style*="target.svg"]{background-image:url(/assets/icons/clear-illustrated-atlas.png)!important;background-size:931.25% auto!important;background-position:0.986842% 22.643343%!important;background-repeat:no-repeat!important;-webkit-mask:none!important;mask:none!important}
.ui-icon[style*="users.svg"]{background-image:url(/assets/icons/clear-illustrated-atlas.png)!important;background-size:931.25% auto!important;background-position:71.005639% 22.643343%!important;background-repeat:no-repeat!important;-webkit-mask:none!important;mask:none!important}
.ui-icon[style*="gear.svg"]{background-image:url(/assets/icons/clear-illustrated-atlas.png)!important;background-size:931.25% auto!important;background-position:28.994361% 37.269193%!important;background-repeat:no-repeat!important;-webkit-mask:none!important;mask:none!important}
.ui-icon[style*="medal.svg"]{background-image:url(/assets/icons/clear-illustrated-atlas.png)!important;background-size:931.25% auto!important;background-position:57.001880% 22.643343%!important;background-repeat:no-repeat!important;-webkit-mask:none!important;mask:none!important}
.ui-icon[style*="play.svg"]{background-image:url(/assets/icons/clear-illustrated-atlas.png)!important;background-size:931.25% auto!important;background-position:71.005639% 67.006803%!important;background-repeat:no-repeat!important;-webkit-mask:none!important;mask:none!important}
.ui-icon[style*="check.svg"]{background-image:url(/assets/icons/clear-illustrated-atlas.png)!important;background-size:931.25% auto!important;background-position:99.013158% 37.269193%!important;background-repeat:no-repeat!important;-webkit-mask:none!important;mask:none!important}
.ui-icon[style*="x.svg"]{background-image:url(/assets/icons/clear-illustrated-atlas.png)!important;background-size:931.25% auto!important;background-position:85.009398% 37.269193%!important;background-repeat:no-repeat!important;-webkit-mask:none!important;mask:none!important}
.ui-icon[style*="wifi-high.svg"]{background-image:url(/assets/icons/clear-illustrated-atlas.png)!important;background-size:931.25% auto!important;background-position:42.998120% 37.269193%!important;background-repeat:no-repeat!important;-webkit-mask:none!important;mask:none!important}
.game-dialog-close svg{background-image:url(/assets/icons/clear-illustrated-atlas.png)!important;background-size:931.25% auto!important;background-position:85.009398% 37.269193%!important;background-repeat:no-repeat!important;-webkit-mask:none!important;mask:none!important}
.game-dialog-close svg>*{visibility:hidden}
.auth-close svg{background-image:url(/assets/icons/clear-illustrated-atlas.png)!important;background-size:931.25% auto!important;background-position:85.009398% 37.269193%!important;background-repeat:no-repeat!important;-webkit-mask:none!important;mask:none!important}
.auth-close svg>*{visibility:hidden}
.fullscreen-button svg{background-image:url(/assets/icons/clear-illustrated-atlas.png)!important;background-size:931.25% auto!important;background-position:57.001880% 37.269193%!important;background-repeat:no-repeat!important;-webkit-mask:none!important;mask:none!important}
.fullscreen-button svg>*{visibility:hidden}
#trial-fullscreen svg{background-image:url(/assets/icons/clear-illustrated-atlas.png)!important;background-size:931.25% auto!important;background-position:57.001880% 37.269193%!important;background-repeat:no-repeat!important;-webkit-mask:none!important;mask:none!important}
#trial-fullscreen svg>*{visibility:hidden}
.game-menu>summary svg{background-image:url(/assets/icons/clear-illustrated-atlas.png)!important;background-size:931.25% auto!important;background-position:14.990602% 37.269193%!important;background-repeat:no-repeat!important;-webkit-mask:none!important;mask:none!important}
.game-menu>summary svg>*{visibility:hidden}
.match-quick-chat>summary svg{background-image:url(/assets/icons/clear-illustrated-atlas.png)!important;background-size:931.25% auto!important;background-position:71.005639% 7.094266%!important;background-repeat:no-repeat!important;-webkit-mask:none!important;mask:none!important}
.match-quick-chat>summary svg>*{visibility:hidden}
.activity-countdown svg{background-image:url(/assets/icons/clear-illustrated-atlas.png)!important;background-size:931.25% auto!important;background-position:85.009398% 7.094266%!important;background-repeat:no-repeat!important;-webkit-mask:none!important;mask:none!important}
.activity-countdown svg>*{visibility:hidden}
.challenge-countdown svg{background-image:url(/assets/icons/clear-illustrated-atlas.png)!important;background-size:931.25% auto!important;background-position:85.009398% 7.094266%!important;background-repeat:no-repeat!important;-webkit-mask:none!important;mask:none!important}
.challenge-countdown svg>*{visibility:hidden}
.replay-icon[data-action="prev"] svg{background-image:url(/assets/icons/clear-illustrated-atlas.png)!important;background-size:931.25% auto!important;background-position:57.001880% 67.006803%!important;background-repeat:no-repeat!important;-webkit-mask:none!important;mask:none!important}
.replay-icon[data-action="prev"] svg>*{visibility:hidden}
.replay-icon[data-action="next"] svg{background-image:url(/assets/icons/clear-illustrated-atlas.png)!important;background-size:931.25% auto!important;background-position:99.013158% 67.006803%!important;background-repeat:no-repeat!important;-webkit-mask:none!important;mask:none!important}
.replay-icon[data-action="next"] svg>*{visibility:hidden}
.replay-icon[aria-label="\u64AD\u653E"] svg{background-image:url(/assets/icons/clear-illustrated-atlas.png)!important;background-size:931.25% auto!important;background-position:71.005639% 67.006803%!important;background-repeat:no-repeat!important;-webkit-mask:none!important;mask:none!important}
.replay-icon[aria-label="\u64AD\u653E"] svg>*{visibility:hidden}
.replay-icon[aria-label="\u6682\u505C"] svg{background-image:url(/assets/icons/clear-illustrated-atlas.png)!important;background-size:931.25% auto!important;background-position:85.009398% 67.006803%!important;background-repeat:no-repeat!important;-webkit-mask:none!important;mask:none!important}
.replay-icon[aria-label="\u6682\u505C"] svg>*{visibility:hidden}
.replay-icon[aria-label="\u91CD\u65B0\u64AD\u653E"] svg{background-image:url(/assets/icons/clear-illustrated-atlas.png)!important;background-size:931.25% auto!important;background-position:0.986842% 80.903790%!important;background-repeat:no-repeat!important;-webkit-mask:none!important;mask:none!important}
.replay-icon[aria-label="\u91CD\u65B0\u64AD\u653E"] svg>*{visibility:hidden}
.signal-bars{background-image:url(/assets/icons/clear-illustrated-atlas.png)!important;background-size:931.25% auto!important;background-position:42.998120% 37.269193%!important;background-repeat:no-repeat!important;-webkit-mask:none!important;mask:none!important}
.signal-bars{position:relative}.signal-bars i.filled{background:transparent!important}.signal-bars i:not(.filled){background:#000b!important;z-index:1}
[data-activity="registration"] .activity-icon{background-image:url(/assets/icons/clear-illustrated-atlas.png)!important;background-size:931.25% auto!important;background-position:14.990602% 22.643343%!important;background-repeat:no-repeat!important;-webkit-mask:none!important;mask:none!important}
[data-activity="daily"] .activity-icon{background-image:url(/assets/icons/clear-illustrated-atlas.png)!important;background-size:931.25% auto!important;background-position:99.013158% 7.094266%!important;background-repeat:no-repeat!important;-webkit-mask:none!important;mask:none!important}
[data-activity="challenges"] .activity-icon{background-image:url(/assets/icons/clear-illustrated-atlas.png)!important;background-size:931.25% auto!important;background-position:0.986842% 22.643343%!important;background-repeat:no-repeat!important;-webkit-mask:none!important;mask:none!important}

.ui-icon{background-color:transparent!important}

#screen .player-equipment-card{display:flex;flex-direction:column}
#screen .player-equipment-card img{flex:1 1 0;height:0;min-height:0;display:block}
#screen .player-equipment-card.long-equipment img{object-fit:cover}
#screen .player-equipment-heading,#screen .player-equipment-card strong{flex:none}

.rank-medal{background-image:url(/assets/icons/clear-medals-chevron.png);background-size:400% auto;background-repeat:no-repeat;background-position:0% 50%}.rank-medal svg{visibility:hidden}.rank-medal.medal-2{background-position:33.333333% 50%}.rank-medal.medal-3{background-position:66.666667% 50%}
.page-back-icon svg{background-image:url(/assets/icons/clear-medals-chevron.png);background-size:400% auto;background-repeat:no-repeat;background-position:100% 50%}.page-back-icon svg>*{visibility:hidden}

/* Full object silhouettes for regenerated equipment; retain cue framing. */
#screen .gear-long-grid .gear-art[data-equipment-category="1"]{object-fit:contain}
#screen .gear-art[data-equipment-category="5"]{object-fit:contain;width:100%}

#screen .player-equipment-card{overflow:hidden}
#screen .player-equipment-card:not(.long-equipment) img{transform:scale(1.6);transform-origin:center}
/* Equipment overview fits its available viewport; cases use three balanced cards. */
#screen .equipment-header-power{white-space:nowrap;font-size:14px;color:#b3bfcc;margin-right:12px}
#screen .equipment-header-power b{color:#a4dfbc}
#screen .equipment-overview-page .page-content,#screen .equipment-overview-page .gear-content{overflow:hidden;min-height:0}
#screen .equipment-overview-page .gear-overview-grid{height:100%;grid-template-columns:repeat(6,minmax(0,1fr));grid-template-rows:repeat(3,minmax(0,1fr));gap:8px}
#screen .equipment-overview-page .gear-overview-item{grid-column:span 2;min-height:0;padding:8px;gap:4px;overflow:hidden}
#screen .equipment-overview-page .gear-overview-long{grid-column:span 3}
#screen .equipment-overview-page .gear-overview-item .gear-art{min-height:0;height:0;flex:1;object-fit:contain}
#screen .equipment-overview-page .gear-name-line{flex-wrap:wrap;gap:4px;flex-shrink:0}
#screen .equipment-overview-page .gear-name-line strong{font-size:12px}
#screen .gear-grid.gear-case-grid{grid-template-columns:repeat(3,minmax(0,1fr))}
#screen .gear-case-grid .gear-card{padding:12px;gap:8px}
#screen .gear-case-grid .gear-preview{display:grid;grid-template-rows:minmax(0,1fr) auto;align-items:center;gap:10px;width:100%;min-height:0}
#screen .gear-case-grid .gear-art{width:100%;height:100%;min-height:0;flex:none;object-fit:contain;object-position:center}
#screen.portrait .equipment-page .page-header{flex-wrap:nowrap;gap:8px}
#screen.portrait .equipment-page .page-header h1{font-size:20px}
#screen.portrait .equipment-header-power{font-size:11px;margin-right:0}
#screen.portrait .equipment-overview-page .gear-overview-item{padding:5px}
#screen.portrait .gear-case-grid .gear-card{padding:6px;gap:4px}
#screen.portrait .gear-grid.gear-case-grid{grid-template-columns:repeat(3,minmax(0,1fr))}
#screen .gear-grid.gear-case-grid .gear-preview{display:grid;grid-template-rows:minmax(0,1fr) auto;align-items:center;gap:10px}
#screen .gear-grid.gear-case-grid .gear-art{height:100%;width:100%;flex:none;min-height:0;object-fit:contain;object-position:center}
/* Case list: two cards, right-aligned price/actions and centered full-size objects. */
#screen .gear-grid.gear-case-grid,#screen.portrait .gear-grid.gear-case-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
#screen .gear-grid.gear-case-grid .gear-card{aspect-ratio:auto;height:190px;min-height:190px;align-items:stretch;padding:12px;gap:12px}
#screen .gear-case-grid .gear-long-heading{display:flex;align-items:center;gap:10px;flex-wrap:nowrap}
#screen .gear-case-grid .gear-name-button{flex:1 1 auto;min-width:0;text-align:left}
#screen .gear-case-grid .gear-long-heading .gear-card-state{margin-left:auto;flex:none}
#screen .gear-case-grid .gear-long-heading .gear-card-actions{margin-left:0;flex:0 0 auto;justify-content:flex-end;width:auto}
#screen .gear-case-grid .gear-long-heading .gear-card-actions>button{flex:none;width:64px;min-width:64px}
#screen .gear-grid.gear-case-grid .gear-preview{display:flex;align-items:center;justify-content:center;flex:1;min-height:0;padding:8px 0}
#screen .gear-grid.gear-case-grid .gear-art{width:100%;height:100%;object-fit:contain;object-position:center}
#screen.portrait .gear-case-grid .gear-long-heading{flex-wrap:wrap;gap:6px}
#screen.portrait .gear-case-grid .gear-name-button{flex-basis:100%}
#screen.portrait .gear-case-grid .gear-long-heading .gear-card-state{margin-left:auto}
#screen.portrait .gear-grid.gear-case-grid .gear-card{height:166px;min-height:166px;padding:8px}

/* One composed signal icon; hidden legacy bars preserve state hooks only. */
#screen .signal-bars{width:32px;height:32px;display:inline-block;transform:none;background-image:none!important;position:relative;--signal-fill:100%}
#screen .signal-bars i{display:none!important;border:0!important;background:none!important}
#screen .signal-bars::before,#screen .signal-bars::after{content:"";position:absolute;inset:0;background-image:url(/assets/icons/clear-illustrated-atlas.png);background-size:931.25% auto;background-position:42.998120% 37.269193%;background-repeat:no-repeat}
#screen .signal-bars::before{filter:grayscale(1);opacity:.45}
#screen .signal-bars::after{clip-path:inset(0 calc(100% - var(--signal-fill)) 0 0)}
#screen .signal-bars[data-bars="0"]{--signal-fill:0%}
#screen .signal-bars[data-bars="1"]{--signal-fill:34%}
#screen .signal-bars[data-bars="2"]{--signal-fill:52%}
#screen .signal-bars[data-bars="3"]{--signal-fill:70%}
#screen .signal-bars[data-bars="4"]{--signal-fill:100%}
#screen .topbar .game-illustration-icon,#screen .topbar .ui-icon{width:34px;height:34px;flex:none}
#screen .topbar .coin-icon{width:32px;height:32px}
#screen .topbar .fullscreen-button svg,#screen .online-game-top .fullscreen-button svg{width:32px;height:32px}
#screen .online-game-top .game-menu>summary svg,#screen .online-game-top .match-quick-chat>summary svg{width:28px;height:28px}

/* Compact informational confirmation: retain refund copy and center all content. */
#screen #overlay[data-drawer=server-void] .dialog{width:360px;min-height:0;padding:24px;gap:18px}
#screen #overlay[data-drawer=server-void] .dialog-head{padding:0;min-height:0;justify-content:center;text-align:center}
#screen #overlay[data-drawer=server-void] .dialog-head h2{font-size:19px;line-height:1.5;margin:0;font-weight:600}
#screen #overlay[data-drawer=server-void] .dialog-body{padding:0;flex:0 0 auto;overflow:visible;text-align:center}
#screen #overlay[data-drawer=server-void] .dialog-body p{margin:0;line-height:1.5}
#screen #overlay[data-drawer=server-void] .dialog-footer{padding:0}

/* Reviewed14October: balances and account footer share stable alignment. */
#screen:not(.portrait) .topbar>.identity{flex:0 1 208px;min-width:160px}
#screen:not(.portrait) .topbar>[data-value=wallet],#screen:not(.portrait) .topbar>[data-value=equipment],#screen:not(.portrait) .topbar>[data-value=leaderboard],#screen:not(.portrait) .topbar>[data-value=records]{flex:1 1 0;min-width:0;padding:0 8px;gap:6px}
#screen .topbar .coin-amount{gap:6px;font-size:16px;white-space:nowrap}
#screen .topbar .game-illustration-icon,#screen .topbar .coin-icon{vertical-align:middle;transform:translateY(-2px)}
#screen .wallet-display{cursor:pointer}
#screen .profile-layout{height:100%;padding-bottom:0}
#screen .profile-sidebar{height:100%;align-items:stretch}
#screen .profile-account-actions,#screen.portrait .profile-account-actions{width:100%;align-items:center;justify-content:center;margin-top:auto;padding:0 0 12px;gap:8px}
#screen .profile-account-actions>button{align-self:center;width:96px;min-width:0;max-width:calc(100% - 8px);margin:0}
#screen .game-settings-panel>.row{height:56px;min-height:56px}
#screen .replay-frame-picker>summary[aria-disabled=true]{cursor:default;pointer-events:none}
#screen .replay-rail details.replay-frame-picker[open]>div{display:flex;flex-direction:column;gap:0;right:calc(100% + 8px);left:auto;top:0;bottom:auto;width:132px;max-height:min(320px,calc(100vh - 120px));overflow-y:auto;background:rgba(9,22,30,.45);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);padding:4px;border:1px solid #ffffff30;border-radius:6px;scrollbar-width:thin;z-index:5}
#screen .replay-frame-picker>div button{width:100%;background:transparent;border:0;border-radius:0;box-shadow:none;min-height:36px;flex:none;color:#edf5f0;padding:6px 12px;white-space:nowrap;text-align:left}
#screen .replay-frame-picker>div button+button{border-top:1px solid #ffffff18}
#screen .replay-frame-picker>div button.active{background:#ffffff12;color:#9be0b8}
.replay-share-dialog{background:#17221e;color:white;border:1px solid #ffffff50;border-radius:8px;padding:20px;max-width:90vw}.replay-share-dialog input{width:100%;min-width:240px;margin-bottom:12px}
#screen .message-entry .game-illustration-icon{content:url(/assets/icons/envelope-clean.png);background-image:none!important;object-fit:contain}
#screen .wallet-list{height:100%;overflow-y:auto;padding:0 8px;scrollbar-width:thin}
#screen .wallet-day{margin-bottom:20px}#screen .wallet-day h2{font-size:16px;color:#bacac0;margin:10px 0}
#screen .wallet-entry{display:grid;grid-template-columns:64px minmax(0,1fr) 120px;align-items:center;gap:16px;min-height:48px;border-bottom:1px solid #ffffff14;padding:8px}
#screen .wallet-entry time{font-size:13px;color:#a6b9ae}#screen .wallet-entry strong{font-size:16px;text-align:right;font-variant-numeric:tabular-nums}#screen .wallet-entry .credit{color:#83dba5}#screen .wallet-entry .debit{color:#f29498}
#screen .wallet-status{text-align:center;padding:16px;color:#afc1b5}
#screen .page:has(.profile-layout)>.page-content{padding-bottom:12px}
#screen .profile-account-actions,#screen.portrait .profile-account-actions{padding-bottom:0}

.replay-share-dialog{pointer-events:auto}
/* Mail-style message center: selection and detail share one page. */
#screen .messages-page .mail-layout{display:grid;grid-template-columns:minmax(180px,32%) minmax(0,1fr);gap:0;overflow:hidden;padding:0;margin:0 24px 16px;min-height:0;border:1px solid #ffffff20;border-radius:8px;background:#101816b3}
#screen .mail-list{overflow-y:auto;min-height:0;border-right:1px solid #ffffff20;scrollbar-width:thin;padding:6px}
#screen .mail-row{display:flex;width:100%;height:auto;min-width:0;text-align:left;gap:8px;padding:12px 10px;border:0;border-bottom:1px solid #ffffff12;border-radius:5px;background:transparent;align-items:flex-start;color:#e8edf0}
#screen .mail-row.mail-selected{background:#16814c66}
#screen .mail-dot{width:6px;height:6px;flex:0 0 6px;background:#ec5360;border-radius:50%;margin-top:6px}
#screen .mail-dot-read{visibility:hidden}
#screen .mail-row .message-copy{display:flex;flex-direction:column;gap:6px;min-width:0;flex:1}
#screen .mail-meta{display:flex;flex-wrap:wrap;justify-content:space-between;gap:3px 8px;font-size:11px;color:#aab9b3}
#screen .mail-row strong{font-size:15px;line-height:1.35;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
#screen .mail-snippet{font-size:12px;color:#9faaa5;line-height:1.45;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
#screen .mail-detail{min-width:0;min-height:0;overflow-y:auto;padding:20px 24px;scrollbar-width:thin}
#screen .mail-detail-heading{border-bottom:1px solid #ffffff20;padding-bottom:16px;margin-bottom:18px}
#screen .mail-detail-heading h2{font-size:22px;line-height:1.4;margin:8px 0}
#screen .mail-kind{font-size:12px;color:#9dd7b8}
#screen .mail-detail-heading time{font-size:12px}
#screen .mail-body-text{white-space:pre-wrap;line-height:1.8;font-size:16px;overflow-wrap:anywhere}
#screen .mail-detail .season-result-content{height:auto;gap:14px}
#screen .mail-detail .season-snapshot-scroll{max-height:245px;min-height:0;overflow:auto}
#screen .mail-detail .season-result-summary h2{font-size:20px}
#screen .mail-detail .season-result-summary p{font-size:13px}
#screen .mail-detail .table{min-width:0;font-size:13px}
#screen .mail-detail .table th,#screen .mail-detail .table td{padding:8px}
#screen .mail-detail .board-avatar{width:24px;height:24px}
#screen .mail-detail .season-trophies{justify-content:center}
#screen .mail-detail .actions{justify-content:center;flex-wrap:wrap;margin-top:20px}
#screen .mail-detail .empty{min-height:180px}
#screen.portrait .messages-page .mail-layout{margin-left:12px;margin-right:12px;grid-template-columns:180px minmax(0,1fr)}
#screen.portrait .mail-detail{padding:16px 12px}

/* Match component alignment and compact equipment review, 2026-10-14. */
#screen .online-game-top>.table-system-message{top:0;font-size:15px}
#screen .online-game-top .match-quick-chat>summary svg,#screen .online-game-top .fullscreen-button svg,#screen .game-dialog-close svg,#screen .auth-close svg{background-image:none!important;color:#fff}
#screen .online-game-top .match-quick-chat>summary svg>*,#screen .online-game-top .fullscreen-button svg>*,#screen .game-dialog-close svg>*,#screen .auth-close svg>*{visibility:visible;stroke:#fff}
#screen .online-game-top .match-quick-chat>summary::marker{content:''}
#screen .online-game-top .match-quick-chat>summary::-webkit-details-marker{display:none}
#screen .online-game-top .match-quick-chat>summary::after,#screen .online-game-top .fullscreen-button::after{content:none!important}
#screen .profile-stat-grid .match-stat>div>span{align-items:center}
#screen .player-equipment-card{display:grid;grid-template-rows:auto minmax(0,1fr);overflow:hidden}
#screen .player-equipment-heading{justify-content:center;min-width:0}
#screen .player-equipment-card img,#screen .player-equipment-card.long-equipment img,#screen .player-equipment-card:not(.long-equipment) img{width:100%;height:100%;object-fit:contain;transform:none;min-height:0}
#screen .equipment-overview-page .gear-overview-item{display:flex;flex-direction:column}
#screen .equipment-overview-page .gear-name-line{justify-content:center}
#screen .table-decision-buttons:not(.color-ball-buttons)>button{height:44px;min-height:44px;min-width:0;flex:1;border:1px solid #49ad76!important;border-radius:6px;background:#168449!important;color:#fff;font-family:inherit;font-size:14px;font-weight:500;line-height:1.2;padding:8px}
#screen .board-own[hidden]{display:none!important}

#screen .mail-row{white-space:normal;box-shadow:none}
#screen .mail-row strong{margin:0}
#screen .mail-snippet{margin:0;padding:0;border:0;background:none;border-radius:0;box-shadow:none;max-width:none}

#screen.portrait .messages-page .mail-layout{display:block}
#screen.portrait .messages-page .mail-list{height:100%;border-right:0}
#screen.portrait .messages-page .mail-detail{display:none}
#screen.portrait .messages-page.mail-portrait-detail .mail-list{display:none}
#screen.portrait .messages-page.mail-portrait-detail .mail-detail{display:block;height:100%}
#screen .mail-detail-heading{position:static;display:block;height:auto;width:auto;overflow:visible}
#screen .mail-detail-heading h2{display:block;color:#f3f7f5}

/* Message content uses the available page area, without a second card shell. */
#screen .messages-page .mail-layout{margin:0;border:0;border-radius:0;background:transparent;box-shadow:none}
#screen .mail-list{padding:0 16px 0 0}
#screen .mail-detail{padding:4px 0 0 24px}
#screen.portrait .messages-page .mail-layout{margin:0}
#screen.portrait .messages-page .mail-list{padding:0}
#screen.portrait .messages-page .mail-detail{padding:4px 0}
#screen .topbar .identity[data-login]{justify-content:center;text-align:center}
#screen [data-board-row]{cursor:pointer}
#screen [data-board-row]:hover{background:#ffffff0a}
#screen [data-board-row]:focus-visible{outline:1px solid #65ba88;outline-offset:-1px}
#screen .rules-confirm-dialog{width:650px;max-width:calc(100% - 32px)}
#screen .rules-confirm-dialog .dialog-body{display:grid;gap:14px}
#screen .room-rule-row{display:grid;grid-template-columns:82px minmax(0,1fr);align-items:center;gap:12px}
#screen .room-rule-row .room-choice{display:flex;width:100%}
#screen .room-rule-row .room-choice button{flex:1;min-width:0;font-size:14px;padding:8px 3px}
#screen .rules-frame-step{display:flex;align-items:center;justify-content:flex-start;gap:24px}
#screen .rules-frame-step span{min-width:120px;text-align:center}
#screen .rules-frame-step button{width:44px;height:36px;min-height:36px}
#screen.portrait .room-rule-row{grid-template-columns:1fr;gap:8px}

/* Approved V11 lobby: 1.5 m camera. Coordinates use the whole scaled screen,
   so the near middle pocket and centre mode share x=50%, including the roster. */
#screen:not(.portrait) .home .mode-nav{position:fixed;left:9.0625%;right:9.0625%;top:54.133857%;bottom:auto;height:20.191286%;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:2.137405%;margin:0;transform:none}
#screen:not(.portrait) .home .mode-nav button{width:100%;height:100%;min-height:0;margin:0}
/* Keep two claimed-account activities at the approved coordinates.
   The registration reward adds a third equal-size card, on the same row. */
#screen:not(.portrait) .home-activities{position:fixed;left:33.8125%;right:33.8125%;top:80.733241%;bottom:auto;height:12.858661%;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));grid-template-rows:minmax(0,1fr);gap:3.474903%;margin:0;flex-wrap:nowrap;transform:none}
#screen:not(.portrait) .home-activities:has([data-activity="registration"]){left:25.4375%;right:25.4375%;grid-template-columns:repeat(3,minmax(0,1fr));column-gap:2.290076%}
#screen:not(.portrait) .home-activities .activity{width:100%;min-width:0;height:100%;min-height:0;padding:10px 14px;display:grid;grid-template-columns:30px minmax(0,1fr);grid-template-rows:minmax(0,1fr) minmax(0,1fr);margin:0;background:#183f22f2;overflow:hidden}
#screen .home-activities .activity>.activity-icon{grid-area:1/1/3/2;align-self:center;justify-self:center}
#screen .home-activities .activity>strong{grid-area:1/2/2/3}
#screen .home-activities .activity>small,#screen .home-activities .activity>.challenge-progress{grid-area:2/2/3/3}
#screen:not(.portrait) .home-activities .activity:hover{background:#20552ee6}
#screen:not(.portrait) .home-activities .activity-cooldown:disabled{background:#18251dcc}
#screen.portrait .home .mode-nav{position:fixed;left:24px;right:82px;top:48%;height:28%;display:grid;grid-template-columns:1fr;grid-template-rows:repeat(3,minmax(0,1fr));gap:12px;bottom:auto}
#screen.portrait .home .mode-nav button{height:100%;min-height:0}
#screen.portrait .home-activities{position:fixed;top:auto;bottom:6.408098%;left:24px;right:72px;display:flex;flex-wrap:nowrap}
#screen.portrait .home-activities .activity{flex:1;min-width:0;grid-template-columns:23px minmax(0,1fr);grid-template-rows:minmax(0,1fr) minmax(0,1fr);overflow:hidden}

/* Match the approved brighter concept without filtering the toolbar or text. */
#game{position:relative;isolation:isolate;background-image:none}
#game::before,#screen .room-loading::before{content:'';position:absolute;inset:0;z-index:-1;pointer-events:none;background:#10151b url('/assets/lobby-crucible-v11-camera150.webp') center/cover no-repeat;filter:none}
#screen .room-loading{isolation:isolate;background-image:none}
#screen .home .mode-nav button:nth-child(n)::before{filter:brightness(1.08) saturate(1.20)}

/* Background is painted at the real viewport size, outside the 960x540
   transformed UI canvas. Always use the approved native 4K render. */
#stage{isolation:isolate}
#screen{background:transparent}
#game{background:transparent}
#game::before{display:none}
#stage::before{content:'';position:absolute;inset:0;z-index:-1;pointer-events:none;background:#10151b url('/assets/lobby-crucible-v12-shadow5-4k.webp?v=3a59ebef9fcf') center/cover no-repeat;filter:none}
:host(.product-loading){isolation:isolate}
:host(.product-loading) #screen .room-loading{background:transparent}
:host(.product-loading) #screen .room-loading::before{display:none}
#screen .room-loading::before{background-image:url('/assets/lobby-crucible-v12-shadow5-4k.webp?v=3a59ebef9fcf')}

/* Eight daily challenges: approved two-column overview, shared rules and reset timer. */
#screen #overlay[data-drawer=training-challenges] .dialog{width:704px;max-width:calc(100% - 32px)}
#screen #overlay[data-drawer=training-challenges] .dialog-head{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:20px 24px 8px;min-height:0;flex-wrap:nowrap}
#screen #overlay[data-drawer=training-challenges] .dialog-head h2{margin:0;font-size:28px;line-height:34px;white-space:nowrap}
#screen .challenge-claimed-progress{font-size:20px;font-weight:600;white-space:nowrap}
#screen #overlay[data-drawer=training-challenges] .dialog-body{display:flex;flex-direction:column;gap:16px;padding:0 20px 20px;min-height:0;overflow:hidden}
#screen .challenge-reward-hint{display:flex;align-items:center;flex-wrap:wrap;gap:4px;font-size:16px;font-weight:400;color:#b5c8ba;line-height:22px;margin:0 4px}
#screen .challenge-reward-tier{white-space:nowrap}
#screen #overlay[data-drawer=training-challenges] .challenge-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;min-height:0;overflow-y:auto;overscroll-behavior:contain;scrollbar-width:thin;scrollbar-color:#79918a transparent}
#screen #overlay[data-drawer=training-challenges] .challenge-item{display:grid;grid-template-columns:minmax(0,1fr) auto 84px;gap:8px;min-height:64px;padding:10px 14px;background:#202c34;box-shadow:none;border-radius:9px}
#screen #overlay[data-drawer=training-challenges] .challenge-copy strong{font-size:22px;white-space:nowrap;line-height:24px}
#screen #overlay[data-drawer=training-challenges] .challenge-amount{font-size:20px;font-weight:600;gap:4px}
#screen #overlay[data-drawer=training-challenges] .challenge-amount:empty{display:none}
#screen #overlay[data-drawer=training-challenges] .challenge-entry{grid-column:3}
#screen #overlay[data-drawer=training-challenges] .challenge-entry button{width:84px;min-width:84px;flex:0 0 84px;height:44px;min-height:44px;font-size:18px;padding:0 8px}
#screen #overlay[data-drawer=training-challenges] .challenge-completed button{outline:1px solid #d3d866;outline-offset:-1px}
#screen #overlay[data-drawer=training-challenges] .challenge-cooling{background:#202c34;color:#aebbb8}
#screen #overlay[data-drawer=training-challenges] .challenge-cooling .challenge-copy{opacity:1}
#screen #overlay[data-drawer=training-challenges] .challenge-claimed:disabled{opacity:1;background:#35434b;color:#aebbb8;box-shadow:none}
#screen .challenge-reset{display:flex;align-items:center;justify-content:space-between;gap:12px;border-top:1px solid #ffffff24;padding:12px 0 0;margin:0 4px;font-size:14px;line-height:20px;color:#b5c8ba}
#screen .challenge-reset-clock{display:inline-flex;gap:6px;white-space:nowrap}
#screen .challenge-reset time{font-weight:600;color:#f6f8fc;font-variant-numeric:tabular-nums}
#screen.portrait #overlay[data-drawer=training-challenges] .dialog{width:492px}
#screen.portrait #overlay[data-drawer=training-challenges] .challenge-list{grid-template-columns:minmax(0,1fr)}
#screen.portrait #overlay[data-drawer=training-challenges] .challenge-item{min-height:64px}
#screen.portrait .challenge-reset{align-items:flex-start;flex-direction:column;gap:4px}

/* Volume shares the settings row and remains usable on touch screens. */
#screen .game-settings-panel input[type=range][data-game-volume]{flex:1;min-width:80px;max-width:180px;width:180px;padding:0;height:32px;accent-color:#42b878;cursor:pointer;touch-action:pan-y}
#screen .game-settings-panel [data-volume-output]{min-width:3.5em;text-align:right;font-variant-numeric:tabular-nums;color:#c8d5cd}

/* Collapsed social entry floats within the safe content area. 80% transparent
   affects its background only, preserving avatar and label contrast. */
#screen .home .roster,#screen.portrait .home .roster{right:12px;top:16px;bottom:auto;height:auto;min-height:0;max-height:calc(100% - 32px);width:64px;margin:0;padding:12px 7px 8px;gap:12px;border:1px solid #ffffff30;border-radius:12px;background:rgba(9,22,30,.2);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);box-shadow:0 4px 16px #0002;overflow:hidden}
#screen .home .roster .roster-expand{display:block;width:100%;font:24px/24px system-ui;color:#e6f1ef;text-align:center;border-top:1px solid #ffffff20;padding-top:4px}
/* Expanded social panel paints to every physical edge. Its content alone avoids
   the cutout/home indicator; the full-screen scrim never moves with the panel. */
:host(.product-player-drawer) #screen #overlay[data-drawer=invite-player]{inset:0;width:100%;height:100%;padding:0;background:rgba(0,0,0,.4)}
:host(.product-player-drawer) #screen #overlay[data-drawer=invite-player] .chat-panel{box-sizing:border-box;right:0;top:0;bottom:0;width:calc(350px + var(--ui-safe-right,0px));max-width:calc(100% - var(--ui-safe-left,0px) - 32px);height:100%;max-height:100%;padding:var(--ui-safe-top,0px) var(--ui-safe-right,0px) var(--ui-safe-bottom,0px) 0;border-radius:0}

/* The opening scrim covers the display; only its player/rule content avoids
   the notch and home indicator. Safe insets are in this canvas's logical units. */
:host(.product-match-opening) #screen .match-found-overlay{padding:var(--ui-safe-top,0px) var(--ui-safe-right,0px) var(--ui-safe-bottom,0px) var(--ui-safe-left,0px)}

/* One continuous segmented control: Safari's default button margins and flex
   rounding must not expose strips between the three player-profile tabs. */
#screen #overlay:is([data-drawer=player],[data-drawer=duel-profile]) .player-profile-tabs{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:0;padding:0;border:0;border-radius:6px;overflow:hidden;background:#18232e;isolation:isolate}
#screen #overlay:is([data-drawer=player],[data-drawer=duel-profile]) .player-profile-tabs>button{box-sizing:border-box;display:flex;align-items:center;justify-content:center;width:100%;min-width:0;margin:0;padding:0 5px;border:0;border-radius:0;background:transparent;appearance:none;-webkit-appearance:none;white-space:nowrap}
#screen #overlay:is([data-drawer=player],[data-drawer=duel-profile]) .player-profile-tabs>button+button{box-shadow:inset 1px 0 #ffffff20}
#screen #overlay:is([data-drawer=player],[data-drawer=duel-profile]) .player-profile-tabs>button.active{background:#168449}

/* Range inputs use only the track/thumb, without a text-field frame. Shared by
   lobby settings and Shadow DOM practice/match panels. */
#screen input[type=range]{appearance:none;-webkit-appearance:none;border:0;border-radius:0;box-shadow:none;background:transparent;min-height:0;height:32px;margin:0;padding:0;accent-color:#42b878}
#screen input[type=range]::-webkit-slider-runnable-track{height:6px;border:0;border-radius:4px;background:linear-gradient(to right,#42b878 var(--setting-range-fill,50%),#ffffff30 var(--setting-range-fill,50%))}
#screen input[type=range]::-webkit-slider-thumb{appearance:none;-webkit-appearance:none;width:18px;height:18px;margin-top:-6px;border:2px solid #a1ebba;border-radius:50%;background:#42b878}
#screen input[type=range]::-moz-range-track{height:6px;border:0;border-radius:4px;background:#ffffff30}
#screen input[type=range]::-moz-range-progress{height:6px;border-radius:4px;background:#42b878}
#screen input[type=range]::-moz-range-thumb{width:14px;height:14px;border:2px solid #a1ebba;border-radius:50%;background:#42b878}
#screen input[type=range]:focus-visible::-webkit-slider-thumb{box-shadow:0 0 0 3px #42b87850}
#screen input[type=range]:focus-visible::-moz-range-thumb{box-shadow:0 0 0 3px #42b87850}

/* One slider layout in personal, practice and match settings: value on the
   left, track aligned with the other controls on the right. */
#screen .game-settings-panel .settings-slider-row .settings-slider-control{display:grid;grid-template-columns:4.2em minmax(0,1fr);align-items:center;gap:10px;width:270px;max-width:calc(100% - 80px);flex-shrink:1}
#screen .game-settings-panel .settings-slider-control output{min-width:0;width:auto;text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums;color:#c8d5cd}
#screen .game-settings-panel .settings-slider-control input[type=range]{display:block;min-width:0;max-width:none;width:100%;height:32px;margin:0;padding:0;touch-action:pan-x;cursor:pointer}

/* Account actions follow the email value within personal details. */
#screen .personal-email-row .personal-logout{align-self:flex-start;margin-top:6px}

/* Public equipment cards reserve a heading and a separate fitted artwork box. */
#screen .player-equipment-card{display:grid;grid-template-rows:20px minmax(0,1fr);gap:4px;padding:6px 8px;min-width:0;min-height:0;overflow:hidden}
#screen .player-equipment-card .player-equipment-heading{height:20px;min-width:0;gap:4px;justify-content:center;overflow:hidden}
#screen .player-equipment-card .gear-tier-tag{flex-shrink:0}
#screen .player-equipment-card .player-equipment-art{position:relative;width:100%;height:100%;min-width:0;min-height:0;overflow:hidden}
#screen .player-equipment-card .player-equipment-art>img{position:absolute;left:50%;top:50%;display:block;flex:none;width:100%;height:100%;min-width:0;min-height:0;max-width:none;max-height:none;margin:0;padding:0;object-fit:contain;transform:translate(-50%,-50%);transform-origin:center}

/* Replay tools share one horizontal bottom rail in portrait. */
#screen.portrait .duel-replay .replay-rail,#screen.portrait .replay-rail{left:12px;right:12px;top:auto;bottom:12px;width:auto;height:44px;display:flex;flex-direction:row;align-items:center;justify-content:center;gap:4px;overflow:visible}
#screen.portrait .replay-rail>button,#screen.portrait .replay-rail summary{width:44px;height:44px;min-height:44px;padding:5px;font-size:12px}
#screen.portrait .replay-rail details.replay-frame-picker[open]>div{top:auto;bottom:calc(100% + 8px);left:0;right:auto}

/* Keep the FPS/network/fullscreen cluster anchored as concession becomes available. */
#screen .online-game-actions [data-value=concede]{order:-1}
#screen .target-ball{display:inline-block;flex:0 0 18px;width:18px;height:18px;border-radius:50%;border:1px solid #ffffffb8;box-shadow:inset -2px -3px 5px #0005}
#screen.portrait .target-ball{flex-basis:16px;width:16px;height:16px}
#screen.portrait .duel-replay .replay-rail,#screen.portrait .replay-rail{bottom:56px}
:host(.product-loading){background:radial-gradient(ellipse at center,#153c36,#0c161e 70%)}

/* One shared outline and one line per divider keep the scoreboard seams even. */
#screen .scoreboard-main{--scoreboard-outline:.5px solid rgba(23,32,30,.38);grid-template-columns:minmax(0,1fr) 237.6px minmax(0,1fr);border:var(--scoreboard-outline);box-sizing:border-box}
#screen .scoreboard-main>.scoreboard-player,#screen .scoreboard-main>.scoreboard-player.current,#screen .scoreboard-main>.central-score{height:100%;min-height:0;border:0}
#screen .scoreboard-main>*+*{border-left:var(--scoreboard-outline)}
#screen .scoreboard-main>.central-score{grid-template-columns:60px minmax(0,1fr) 60px;border-left:var(--scoreboard-outline)}
#screen .scoreboard-main>.scoreboard-player.opponent{border-left:var(--scoreboard-outline)}
#screen .central-score .frame-tally{height:100%;border:0;border-left:var(--scoreboard-outline);border-right:var(--scoreboard-outline)}
#screen .scoreboard-main>.scoreboard-player:not(.opponent){padding-left:35px}
#screen .scoreboard-main>.scoreboard-player.opponent{padding-right:35px}
#screen .floating-break{border:var(--scoreboard-outline);border-bottom:0;left:0;right:0}
#screen.portrait .scoreboard-main{grid-template-columns:minmax(0,1fr) 199.2px minmax(0,1fr)}
#screen.portrait .scoreboard-main>.central-score{grid-template-columns:43.2px minmax(0,1fr) 43.2px}
#screen.portrait .scoreboard-main>.scoreboard-player:not(.opponent){padding-left:26px}
#screen.portrait .scoreboard-main>.scoreboard-player.opponent{padding-right:26px}

/* Match chrome keeps the aiming corridor clear: tools left, views right. */
#screen .online-game-top.match-topbar,#screen.portrait .online-game-top.match-topbar{--match-control-height:40px;align-items:flex-start;height:62px;gap:8px;padding:6px 10px}
#screen .online-game-top.match-topbar.mobile-game-chrome{padding-left:0;padding-right:0}
#screen .online-game-tools{display:flex;align-items:center;gap:8px;flex:none}
#screen .match-topbar .online-game-tools{flex-direction:column;align-items:flex-start;gap:6px;width:40px}
#screen .match-topbar .online-game-tools summary{display:flex;align-items:center;justify-content:center;width:40px;height:var(--match-control-height);min-width:0;min-height:0;padding:0;box-sizing:border-box}
#screen .match-topbar .online-game-status{height:40px;padding-top:0;gap:8px;align-items:center}
#screen .match-topbar .online-game-actions{position:relative;inset:auto;display:grid;grid-template-columns:auto auto minmax(0,1fr);grid-template-rows:auto 40px;align-items:start;column-gap:6px;row-gap:4px}
#screen .match-topbar .online-game-actions>.fps-readout{position:static;grid-row:2;grid-column:3;justify-self:end;margin:0;text-align:right}
#screen .match-view-group{position:relative;display:flex;align-items:stretch;width:216px;height:var(--match-control-height,40px);padding:0;overflow:hidden;border:0;border-radius:6px;background:transparent;pointer-events:auto}
#screen .match-view-group>button{flex:1;width:25%;min-width:0;height:100%;min-height:0;padding:0;border:0;border-radius:0;position:relative;z-index:1;background:transparent;color:transparent;font-size:14px;font-weight:700;line-height:1;box-shadow:none}
#screen .match-view-group>button+button{border-left:0}
#screen .match-view-group>button[aria-pressed=true]{background:transparent;color:transparent}
#screen .match-view-group>button:disabled{opacity:.45;cursor:default}
#screen .match-view-group>button:focus-visible{outline:2px solid #e6c478;outline-offset:-3px}
#screen.portrait .online-game-top.match-topbar{--match-control-height:36px}
#screen.portrait .match-topbar .online-game-status{gap:4px}
#screen.portrait .match-topbar .online-game-tools{width:36px}
#screen.portrait .match-topbar .online-game-tools summary{width:36px;height:var(--match-control-height)}
#screen.portrait .match-topbar .online-game-status{height:36px}
#screen.portrait .match-view-group{width:136px}
#screen.portrait .match-view-group>button{font-size:12px;height:100%;min-height:0}
#screen .match-topbar .match-view-group{grid-row:1;grid-column:1 / -1;justify-self:end}
#screen .match-topbar .online-game-actions>[data-action=invite]{grid-row:2;grid-column:1}
#screen .match-topbar .online-game-actions>[data-action=share]{grid-row:2;grid-column:2}
#screen .match-topbar .online-game-actions>[data-action=start-matching]{grid-row:2;grid-column:1 / 3}

#screen .match-view-art{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}

#screen .practice-topbar .online-game-actions>[data-action=invite]{grid-row:1;grid-column:1}
#screen .practice-topbar .online-game-actions>[data-action=share]{grid-row:1;grid-column:2}
#screen .practice-topbar .online-game-actions>[data-action=start-matching]{grid-row:1;grid-column:1 / 3}

/* Waiting-room actions end at the same edge as the match view group. */
#screen .practice-topbar .online-game-actions{grid-template-columns:auto auto}
#screen .practice-topbar .online-game-actions>.fps-readout{grid-column:2}

/* Game settings controls use their segments/track only, without field frames. */
#screen .game-settings-panel .settings-segment{border:1px solid #ffffff80;outline:0;box-shadow:none}
#screen .game-settings-panel .settings-segment>button{border:0;box-shadow:none}
#screen .game-settings-panel .settings-segment>button+button{box-shadow:inset 1px 0 #ffffff20}
#screen .game-settings-panel .settings-segment>button:focus-visible{outline:2px solid #9ae8b6;outline-offset:-3px}
#screen .game-settings-panel input[type=range]{appearance:none;-webkit-appearance:none;border:0;border-radius:0;outline:none;box-shadow:none;background:transparent}
#screen .game-settings-panel input[type=range]:focus-visible::-webkit-slider-thumb{box-shadow:0 0 0 3px #42b87850}
#screen .game-settings-panel input[type=range]:focus-visible::-moz-range-thumb{box-shadow:0 0 0 3px #42b87850}

/* Functional game chrome uses white vector glyphs rather than green atlas art. */
#screen :is(.fullscreen-button,.replay-icon) svg,#screen .game-menu>summary svg{background-image:none!important;color:#fff;-webkit-mask:none!important;mask:none!important}
#screen :is(.fullscreen-button,.replay-icon) svg>*,#screen .game-menu>summary svg>*{visibility:visible!important;stroke:#fff}
#screen .signal-bars{display:inline-flex;width:22px;height:22px;align-items:flex-end;gap:2px;background-image:none!important}
#screen .signal-bars::before,#screen .signal-bars::after{content:none!important;display:none}
#screen .signal-bars i{display:block!important;border:1px solid #ffffff38!important;background:transparent!important}
#screen .signal-bars i.filled{background:#fff!important;border-color:#fff!important}

/* Keep live connection and rendering metrics above the match camera controls. */
#screen .game-metrics{display:flex;align-items:center;justify-content:flex-end;gap:10px;font-size:12px;font-weight:500;line-height:20px;color:#d7e5df;white-space:nowrap;font-variant-numeric:tabular-nums}
#screen.portrait .game-metrics{font-size:11px}
#screen .game-metrics>.fps-readout,#screen .game-metrics>.ping-readout{font:inherit;font-variant-numeric:tabular-nums}
#screen .match-topbar .online-game-actions{grid-template-rows:20px auto}
#screen .match-topbar .online-game-actions>.game-metrics{grid-row:1;grid-column:1 / -1;justify-self:end}
#screen .match-topbar .match-view-group{grid-row:2}
#screen .practice-topbar .online-game-actions{grid-template-rows:40px 20px}
#screen .practice-topbar .online-game-actions>.game-metrics{grid-row:2;grid-column:1 / -1}

/* Match both right-hand rows to the status and chat controls on the left. */
#screen .match-topbar:not(.practice-topbar) .online-game-actions{grid-template-rows:40px 40px;row-gap:6px;align-items:center}
#screen.portrait .match-topbar:not(.practice-topbar) .online-game-actions{grid-template-rows:36px 36px}

/* Camera controls first, live metrics second. */
#screen .match-topbar:not(.practice-topbar) .match-view-group{grid-row:1}
#screen .match-topbar:not(.practice-topbar) .online-game-actions>.game-metrics{grid-row:2}

/* One control-height column for match status and live metrics. */
#screen .game-status-lines{display:flex;flex-direction:column;align-items:flex-start;gap:0;min-width:0;text-align:left}
#screen .game-status-lines>strong{display:block;line-height:20px}
#screen .game-status-lines>.game-metrics{justify-content:flex-start;align-self:flex-start;line-height:20px}
#screen.portrait .game-status-lines>strong,#screen.portrait .game-status-lines>.game-metrics{line-height:18px}

/* Compact two-line live metrics at the right edge, below camera controls. */
#screen .game-metrics{flex-direction:column;align-items:flex-end;justify-content:center;gap:0;font-size:10px;line-height:12px;text-align:right}
#screen.portrait .game-metrics{font-size:9px;line-height:11px}

/* Fixed readout slots keep both labels steady as numeric widths change. */
#screen .game-metrics{flex-direction:row;align-items:center;justify-content:flex-end;gap:4px}
#screen .game-metrics>.ping-readout{flex:0 0 12ch;width:12ch;text-align:left}
#screen .game-metrics>.fps-readout{flex:0 0 9ch;width:9ch;text-align:left}

/* Fit each right-hand row to its content with a small camera/metrics gap. */
#screen .match-topbar:not(.practice-topbar) .online-game-actions,#screen.portrait .match-topbar:not(.practice-topbar) .online-game-actions{grid-template-rows:auto auto;row-gap:2px;align-items:start}

/* Keep the FPS label fixed while the final digit reaches the camera edge. */
#screen .game-metrics>.fps-readout{display:inline-flex;align-items:center;justify-content:space-between}
#screen .fps-readout>.metric-label{flex:none}
#screen .fps-readout>.metric-value{min-width:4ch;text-align:right;font-variant-numeric:tabular-nums}

/* Compact fixed label/value columns without changing the aligned right edge. */
#screen .game-metrics>.ping-readout,#screen .game-metrics>.fps-readout{display:inline-grid;flex:0 0 auto;width:auto;align-items:center;column-gap:2px}
#screen .game-metrics>.ping-readout{grid-template-columns:max-content 5ch max-content}
#screen .game-metrics>.fps-readout{grid-template-columns:max-content 4ch}
#screen .game-metrics .metric-value{min-width:0;width:100%;font-variant-numeric:tabular-nums}
#screen .ping-readout>.metric-value{text-align:left}
#screen .fps-readout>.metric-value{text-align:right}

/* Keep the latency number and its unit together; reserve space after the reading. */
#screen .game-metrics>.ping-readout{grid-template-columns:max-content 6ch}
#screen .game-metrics>.fps-readout{grid-template-columns:max-content 3ch}
#screen .ping-readout>.metric-reading{display:block;min-width:0;white-space:nowrap;text-align:left}
#screen .ping-readout .metric-value{display:inline;width:auto}


/* Fullscreen anchors the room's right edge; visible actions share one fixed gap.
   Readouts sit below the row without widening invitation/share button slots. */
#screen .online-game-top.match-topbar .online-game-actions,#screen.portrait .online-game-top.match-topbar .online-game-actions{display:flex;align-items:flex-start;gap:6px;--topbar-action-gap:6px}
#screen .online-game-top.match-topbar .online-game-actions>.fullscreen-button{flex:0 0 var(--topbar-action-height);width:var(--topbar-action-height);height:var(--topbar-action-height);min-height:var(--topbar-action-height);padding:0}
#screen .online-game-top.match-topbar .online-game-actions>.game-metrics{position:absolute;top:calc(var(--topbar-action-height) + 2px);right:0;margin:0}
#screen .match-topbar:not(.practice-topbar) .online-game-actions>[data-action=concede]{align-self:stretch;height:auto;min-height:0;padding:0 10px;white-space:nowrap}

/* Five room settings must fit alongside the header/footer in landscape. */
#screen:not(.portrait) .page:has(.room-config){padding-top:12px;padding-bottom:12px}
#screen:not(.portrait) .page:has(.room-config) .page-header{margin-bottom:8px}
#screen:not(.portrait) .room-config{gap:4px}
#screen:not(.portrait) .room-option{min-height:52px;padding:4px 0}
#screen:not(.portrait) .page:has(.room-config)>.page-footer{padding-top:8px;flex-shrink:0}
#screen:not(.portrait) .rules-confirm-dialog .dialog-body{gap:8px;padding-top:8px;padding-bottom:8px;flex:0 0 auto}
#screen:not(.portrait) .rules-confirm-dialog .dialog-head{padding-top:12px;padding-bottom:8px;min-height:0}
#screen:not(.portrait) .rules-confirm-dialog .dialog-footer{padding-top:8px;padding-bottom:12px}
#screen:not(.portrait) .rules-confirm-dialog .actions{margin-top:0}
:host(.product-player-drawer) #screen .drawer-dismiss-area{position:absolute;inset:0;width:100%;height:100%;min-height:0;margin:0;padding:0;border:0;border-radius:0;background:transparent;box-shadow:none;z-index:0;touch-action:manipulation}
:host(.product-player-drawer) #screen #overlay .chat-panel{z-index:1}
:host(.product-loading[data-shared-background])::before{display:none}

/* Camera segments share invitation/share dimensions in both orientations. */
#screen .online-game-top{--topbar-action-width:48px;--topbar-action-height:40px}
#screen .online-game-top .online-game-actions>[data-action=invite],
#screen .online-game-top .online-game-actions>[data-action=share]{width:var(--topbar-action-width);min-width:var(--topbar-action-width);height:var(--topbar-action-height);min-height:var(--topbar-action-height);padding:0;font-size:14px;white-space:nowrap}
#screen .online-game-top .match-view-group{width:calc(4 * var(--topbar-action-width));min-width:calc(4 * var(--topbar-action-width));height:var(--topbar-action-height);flex-shrink:0}
#screen .online-game-top .match-view-group>button{flex:0 0 var(--topbar-action-width);width:var(--topbar-action-width);height:var(--topbar-action-height);font-size:14px;white-space:nowrap}

/* Mobile game targets grow independently of the existing row/column gaps. */
#screen .online-game-top.mobile-game-chrome{--topbar-action-width:57.6px;--topbar-action-height:48px}
#screen .match-topbar.mobile-game-chrome .online-game-tools{width:48px}
#screen .match-topbar.mobile-game-chrome .online-game-tools :is(.game-menu,.match-quick-chat)>summary{width:48px;height:48px}
#screen.portrait .match-topbar.mobile-game-chrome .online-game-tools{width:43.2px}
#screen.portrait .match-topbar.mobile-game-chrome .online-game-tools :is(.game-menu,.match-quick-chat)>summary{width:43.2px;height:43.2px}
#screen .online-game-top.mobile-game-chrome .match-view-group{width:253.44px;min-width:253.44px;height:48px}
#screen .online-game-top.mobile-game-chrome .match-view-group>button{flex-basis:63.36px;width:63.36px;height:48px}

/* Place the quick-chat list below its enlarged mobile trigger. */
#screen .match-topbar.mobile-game-chrome .match-quick-chat>div{top:calc(100% + 4px)}

/* Player lists never scroll sideways; long names shrink within the row. */
#screen #overlay .chat-panel:has(.social-tabs) .dialog-body{overflow-x:hidden;overflow-y:auto}
#screen #playerList{min-width:0;max-width:100%}
#screen #playerList .social-player-info{min-width:0;flex:1}
#screen #playerList .social-name-line .linkbtn{max-width:100%}

#screen .home .roster .roster-title{display:block;min-width:max-content;max-width:100%;font-size:11px;letter-spacing:0;white-space:pre;text-overflow:clip;font-variant-numeric:tabular-nums}
:host(.product-player-drawer) #screen #overlay .chat-panel .dialog-body{touch-action:pan-y;overscroll-behavior:contain;-webkit-overflow-scrolling:touch}

/* Announcements live only in the lobby document; routes never load this UI. */
.announcement-body{white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.8;margin:0}
#screen .announcement-banner{position:absolute;top:12px;left:50%;transform:translateX(-50%);z-index:150;width:360px;max-width:calc(100% - 40px);padding:14px 18px;color:#f0f2e9;pointer-events:auto;display:flex;flex-direction:column;align-items:stretch;gap:12px}
.announcement-banner-copy{min-width:0}.announcement-banner strong{display:block;font-size:17px;line-height:1.5;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.announcement-banner p{font-size:13px;line-height:1.5;margin:5px 0 0}.announcement-banner-copy>p:not([data-announcement-error]){display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#c8d8cb}.announcement-banner-actions{display:flex;justify-content:center;align-items:center;gap:12px;flex-wrap:wrap}
.announcement-banner [data-announcement-error],.announcement-body+[data-announcement-error]{color:#ffb6a5}.announcement-banner [data-announcement-error]:empty{display:none}

/* Borderless game controls and cards; keyboard focus remains an outline. */
#screen button,#screen button.danger,#screen [role=button],#screen summary,
.auth-dialog button,.replay-share-dialog button{border:0!important}
#screen .table-decision-buttons:not(.color-ball-buttons)>button{border:0!important}
#screen :is(.card,.result-panel,.device-card,.seat,.message-card,.gear-card,.gear-overview-item,.challenge-item,.mail-preview,.summary,.dialog,.chat-panel,.topbar,.roster,.activity,.ranked-field,.player-equipment-card,.cue-view-panel,.gear-preview,.board-own,.honor-cabinet,.settings-segment),
#screen .stat-row>div,#screen .profile-stat-grid>div,.auth-dialog,.replay-share-dialog{border:0!important}
#screen button{box-shadow:none}
#screen button.primary,#screen button.active{box-shadow:0 3px 10px #0002}

/* Wins, losses and win rate use the same number size as the other statistics. */
#screen .profile-stat-grid .match-stat>div{justify-content:flex-start;gap:4px;flex-wrap:wrap}
#screen .profile-stat-grid .match-stat>div>span{justify-content:flex-start;gap:3px}
#screen .profile-stat-grid .match-stat b{font-size:26px;line-height:1.15}
#screen #overlay:is([data-drawer=player],[data-drawer=duel-profile]) .match-stat>div{justify-content:flex-start;gap:4px}
#screen #overlay:is([data-drawer=player],[data-drawer=duel-profile]) .match-stat span{gap:3px}
#screen #overlay:is([data-drawer=player],[data-drawer=duel-profile]) .match-stat span b{font-size:28px;line-height:32px}
#screen.portrait .profile-stat-grid .match-stat{grid-column:1/-1}
#screen.portrait #overlay:is([data-drawer=player],[data-drawer=duel-profile]) .profile-stat-grid{grid-template-rows:60px 60px repeat(3,64px);gap:8px}
#screen.portrait #overlay:is([data-drawer=player],[data-drawer=duel-profile]) .profile-stat-grid .match-stat{grid-column:1/-1;height:auto;margin:0;padding:3px 14px}
#screen.portrait #overlay:is([data-drawer=player],[data-drawer=duel-profile]) .match-stat>div{gap:4px}

/* Waiting labels animate only opacity; no layout, shadow or filter animation. */
#screen .ranked-field strong{position:relative}
#screen .ranked-field strong .ranked-waiting{position:absolute;left:100%;top:50%;transform:translateY(-50%);margin-left:8px;font-size:11px;line-height:1.4;letter-spacing:0;font-weight:400;color:#c7e8cf;white-space:nowrap;text-shadow:none}
#screen .ranked-field strong .ranked-waiting[hidden]{display:none}
#screen .ranked-field .ranked-waiting:not([hidden]){animation:ranked-waiting-breathe 2.8s ease-in-out infinite}
#screen .ranked-page[data-waiting-paused] .ranked-waiting{animation-play-state:paused}
@keyframes ranked-waiting-breathe{0%,100%{opacity:.45}50%{opacity:1}}
@media(prefers-reduced-motion:reduce){#screen .ranked-field .ranked-waiting:not([hidden]){animation:none;opacity:1}}

/* Friend frame results show just one accumulated bonus below each score. */
#screen .settlement-versus .friendly-break-reward{display:flex;flex-direction:row;align-items:center;justify-content:center;gap:6px;margin:0;padding-top:5px;font-size:14px;line-height:1.5;white-space:nowrap;color:#b3bfcc}
#screen .settlement-versus .friendly-break-reward[hidden]{display:none}
#screen .settlement-versus .result-bonus-left{grid-column:1;grid-row:3}
#screen .settlement-versus .result-bonus-right{grid-column:3;grid-row:3}
#screen .friendly-break-reward .coin-amount{color:#ffd165;font-weight:600}
#screen .friendly-break-reward .coin-icon{width:18px;height:18px}

/* Share difficulty colors between invitations and the waiting-room badge. */
#screen .top-notice .invite-difficulty{font-size:14px;font-weight:700}
#screen :is(.top-notice,[data-waiting-room-difficulty],.room-rules) .difficulty-novice{color:#66d98b}
#screen :is(.top-notice,[data-waiting-room-difficulty],.room-rules) .difficulty-intermediate{color:#69baff}
#screen :is(.top-notice,[data-waiting-room-difficulty],.room-rules) .difficulty-professional{color:#ffd65a}
#screen :is(.top-notice,[data-waiting-room-difficulty],.room-rules) .difficulty-master{color:#ff9c4a}
#screen :is(.top-notice,[data-waiting-room-difficulty],.room-rules) .difficulty-no-lines{color:#ff6b6b}
#screen #playerList .room-view{background:#ffffff08;border:1px solid #6b858d;color:#dceef0;box-shadow:none}
#screen #playerList .room-view[aria-expanded=true]{background:#284842;border-color:#7ebba8;color:#e6f8ef}
#screen .room-rules{position:absolute;z-index:2;box-sizing:border-box;display:grid;gap:9px;width:154px;padding:10px 11px;background:#151b22;border:1px solid #ffffff38;border-radius:12px;box-shadow:0 8px 24px #0006}
#screen .room-rules[hidden]{display:none}
#screen .room-rules::after{content:'';position:absolute;top:var(--room-arrow-top,50%);right:-5px;width:10px;height:10px;box-sizing:border-box;border-top:1px solid #ffffff38;border-right:1px solid #ffffff38;background:#151b22;transform:translateY(-50%) rotate(45deg)}
#screen .room-rules dl{margin:0;display:grid;gap:4px}
#screen .room-rules dl>div{display:flex;justify-content:space-between;align-items:baseline;gap:5px;white-space:nowrap}
#screen .room-rules dt{font-size:12px;color:#c6d2db}
#screen .room-rules dd{margin:0;font-size:13px;font-weight:700;color:#f6f8fc}
#screen .room-rules button{justify-self:center;box-sizing:border-box;width:64px;height:38px;min-height:38px;margin:0;padding:0;font-size:14px;border-radius:7px}
`;
    }
  });

  // apps/three-game/product/modal-backdrop.cjs
  var require_modal_backdrop = __commonJS({
    "apps/three-game/product/modal-backdrop.cjs"(exports, module) {
      "use strict";
      function bindModalBackdrop({ host, screen, onChange = () => {
      } }) {
        const backdrop = document.createElement("div");
        backdrop.id = "product-modal-backdrop";
        backdrop.hidden = true;
        backdrop.setAttribute("aria-hidden", "true");
        screen.parentNode.insertBefore(backdrop, screen);
        let activeOverlay = null, disposed = false;
        function sync() {
          if (disposed) return;
          const overlay = screen.querySelector("#overlay");
          const panel = overlay?.querySelector('[role="dialog"],.dialog');
          const native = panel?.tagName === "DIALOG";
          const visible = panel && (!native || panel.open);
          activeOverlay = !host.hidden && overlay && visible && !overlay.closest("[hidden]") && !panel.closest("[hidden]") ? overlay : null;
          if (backdrop.hidden !== !activeOverlay) backdrop.hidden = !activeOverlay;
          host.toggleAttribute("data-viewport-backdrop", Boolean(activeOverlay));
          onChange(activeOverlay && native ? panel : null);
        }
        backdrop.addEventListener("click", (event) => {
          if (!activeOverlay) return;
          activeOverlay.dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true, cancelable: true, clientX: event.clientX, clientY: event.clientY }));
        });
        const observer = new MutationObserver(sync);
        observer.observe(screen, { subtree: true, childList: true, attributes: true, attributeFilter: ["hidden", "open", "class"] });
        observer.observe(host, { attributes: true, attributeFilter: ["hidden"] });
        sync();
        return { sync, destroy() {
          disposed = true;
          observer.disconnect();
          backdrop.remove();
          host.removeAttribute("data-viewport-backdrop");
        } };
      }
      module.exports = { bindModalBackdrop };
    }
  });

  // apps/three-game/product/visual-layer.cjs
  var require_visual_layer = __commonJS({
    "apps/three-game/product/visual-layer.cjs"(exports, module) {
      "use strict";
      function notificationStack() {
        return window[/* @__PURE__ */ Symbol.for("snooker.product.notifications")] ||= { hosts: /* @__PURE__ */ new Map(), modals: /* @__PURE__ */ new Map(), order: "" };
      }
      function nativeNotificationModalChanged(dialog) {
        const stack = notificationStack();
        if (stack.modals.get(document) === (dialog || void 0)) return;
        if (dialog) stack.modals.set(document, dialog);
        else stack.modals.delete(document);
        if (stack.hosts.size) refreshNotifications();
      }
      function refreshNotifications(force = false) {
        const stack = notificationStack();
        for (const [host, dialog2] of stack.modals) if (!host.isConnected || host !== document && host.hidden || !dialog2.open) stack.modals.delete(host);
        const dialog = [...stack.modals.values()].at(-1), parent = dialog || document.fullscreenElement || document.body;
        const visible = [...stack.hosts].filter(([host]) => !host.hidden).sort((a, b) => a[1] - b[1]);
        const order = visible.map(([host]) => [...stack.hosts.keys()].indexOf(host)).join(",");
        const changed = stack.parent !== parent || stack.order !== order;
        stack.parent = parent;
        stack.order = order;
        for (const [host] of stack.hosts) {
          const open = typeof host.showPopover === "function" && host.matches(":popover-open");
          if (open && (host.hidden || changed)) host.hidePopover();
          if (host.parentNode !== parent) parent.append(host);
        }
        for (const [host] of visible) {
          if (typeof host.showPopover === "function") {
            if (!host.matches(":popover-open")) host.showPopover();
          } else if (changed || force === true) {
            host.style.transform = "none";
            host.style.transformOrigin = "0 0";
            if (dialog) {
              const rect = host.getBoundingClientRect(), x = rect.width / host.offsetWidth || 1, y = rect.height / host.offsetHeight || 1;
              host.style.transform = `translate(${-rect.left / x}px,${-rect.top / y}px) scale(${1 / x},${1 / y})`;
            }
          }
        }
      }
      function createVisualLayer(className, { viewportModal = false, fullBleed = false, notification = false, notificationPriority = 10 } = {}) {
        const host = document.createElement("div");
        host.className = className;
        host.hidden = true;
        const shadow = host.attachShadow({ mode: "open" });
        const style = document.createElement("style");
        style.textContent = require_design_style() + `
 :host{display:block;position:fixed;inset:0;z-index:160;pointer-events:none}:host([hidden]){display:none}
 #screen{position:absolute;left:0;top:0;border:0;margin:0;padding:0;background:none;box-shadow:none;transform-origin:top left;pointer-events:none;font:14px/1.5 Inter,-apple-system,"system-ui","PingFang SC","Microsoft YaHei",sans-serif;font-variant-numeric:tabular-nums;color:#f6f8fc}
 #overlay{pointer-events:auto}#overlay[hidden]{display:none}
 #product-modal-backdrop{position:fixed;inset:0;z-index:0;box-sizing:border-box;margin:0;padding:0;width:auto;height:auto;background:#0006;backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px);pointer-events:auto;touch-action:none}
 #product-modal-backdrop[hidden]{display:none}
 #screen{z-index:1}
 :host([data-viewport-backdrop]) #screen #overlay{background:transparent!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important}
 :host([data-viewport-backdrop]) dialog::backdrop{background:transparent!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important}


 `;
        if (viewportModal) style.textContent += `
 #screen{position:fixed;inset:0;width:100%;height:100%;transform:none;overflow:visible}
 #screen #overlay{position:fixed;inset:0;padding:0;background:transparent;backdrop-filter:none;pointer-events:none}
 #screen dialog.dialog{position:fixed;inset:auto;left:50%;top:50%;margin:0;transform:translate(-50%,-50%);transform-origin:center;zoom:1;width:min(480px,calc(100% - 64px - env(safe-area-inset-left,0px) - env(safe-area-inset-right,0px)));height:auto;padding:0;min-height:0;max-width:none;max-height:calc(var(--modal-viewport-height,100vh) - 64px - env(safe-area-inset-top,0px) - env(safe-area-inset-bottom,0px));overflow:visible;pointer-events:auto;font-size:15px}
 #screen dialog.dialog:not([open]){display:none}
 #screen dialog.dialog::backdrop{position:fixed;inset:0;transform:none;zoom:1;margin:0;max-width:none;max-height:none;background:#0008;backdrop-filter:blur(3px)}
 #screen dialog.dialog .dialog-body{flex:1 1 0%;overflow-y:scroll;overscroll-behavior:contain;min-height:0;scrollbar-gutter:stable;scrollbar-width:thin;scrollbar-color:#8ba69b #ffffff12}
 #screen dialog.dialog .dialog-body::-webkit-scrollbar{width:8px}
 #screen dialog.dialog .dialog-body::-webkit-scrollbar-track{background:#ffffff12;border-radius:6px}
 #screen dialog.dialog .dialog-body::-webkit-scrollbar-thumb{background:#8ba69b;border-radius:6px;border:2px solid #1e2b26}
 :host{touch-action:none}
 #screen dialog.dialog .settings-scroll-body{scrollbar-width:none;padding-right:32px;touch-action:none}
 #screen dialog.dialog .settings-scroll-body::-webkit-scrollbar{display:none}
 #screen .settings-scroll-body .game-settings-panel,#screen .settings-scroll-body .game-settings-panel *{touch-action:none;user-select:none;-webkit-user-select:none}
 #screen .settings-scrollbar{position:absolute;right:3px;width:22px;z-index:2;cursor:pointer;touch-action:none;border-radius:8px;outline-offset:-2px}
 #screen .settings-scrollbar[hidden]{display:none}
 #screen .settings-scrollbar::before{content:'';position:absolute;inset:0 7px;background:#ffffff20;border-radius:5px}
 #screen .settings-scrollbar>span{position:absolute;top:0;left:7px;width:8px;border-radius:5px;background:#9db8ac;box-shadow:0 0 0 1px #0004}
 #screen .game-settings-panel .row{gap:10px}
 #screen .game-settings-panel .row>span{flex-shrink:0}
 #screen .game-settings-panel .settings-segment{min-width:0;flex-shrink:1}
 #screen .game-settings-panel .settings-segment button{min-width:0;padding:8px 10px}
 #screen .settings-slider-control input[type=range]::-webkit-slider-runnable-track{height:6px;border-radius:4px;background:linear-gradient(to right,#42b878 var(--setting-range-fill,50%),#ffffff30 var(--setting-range-fill,50%))}
 #screen .settings-slider-control input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:18px;height:18px;margin-top:-6px;border:2px solid #a1ebba;border-radius:50%;background:#42b878}
 #screen .settings-slider-control input[type=range]::-moz-range-track{height:6px;border-radius:4px;background:#ffffff30}
 #screen .settings-slider-control input[type=range]::-moz-range-progress{height:6px;border-radius:4px;background:#42b878}
 #screen .settings-slider-control input[type=range]::-moz-range-thumb{width:14px;height:14px;border:2px solid #a1ebba;border-radius:50%;background:#42b878}
 @media(max-width:480px){#screen dialog.dialog .dialog-body{padding:12px}#screen dialog.dialog .settings-scroll-body{padding-right:30px}#screen .game-settings-panel .settings-segment button{padding:8px}#screen .game-settings-panel .row{gap:6px}}
 `;
        style.textContent += window.ProductInteraction?.css || "";
        const unbindInteraction = window.ProductInteraction?.bind(shadow);
        const screen = document.createElement("div");
        screen.id = "screen";
        shadow.append(style, screen);
        document.body.append(host);
        if (notification) {
          if (!notificationStack().hosts.size) {
            const stack = notificationStack();
            stack.fullscreenHandler = refreshNotifications;
            document.addEventListener("fullscreenchange", stack.fullscreenHandler);
          }
          host.dataset.globalNotification = "";
          if (typeof host.showPopover === "function") host.setAttribute("popover", "manual");
          style.textContent += ":host([data-global-notification]){z-index:2147483647!important;margin:0;padding:0;border:0;overflow:visible;background:transparent;color:inherit}:host([data-global-notification])::backdrop{background:transparent;pointer-events:none}";
          notificationStack().hosts.set(host, notificationPriority);
        }
        const notificationObserver = notification ? new MutationObserver(refreshNotifications) : null;
        notificationObserver?.observe(host, { attributes: true, attributeFilter: ["hidden"] });
        const modalBackdrop = notification ? { sync() {
        }, destroy() {
        } } : require_modal_backdrop().bindModalBackdrop({ host, screen, onChange(dialog) {
          const stack = notificationStack();
          if (dialog) {
            if (stack.modals.get(host) !== dialog) {
              stack.modals.delete(host);
              stack.modals.set(host, dialog);
            }
          } else stack.modals.delete(host);
          if (stack.hosts.size) refreshNotifications();
        } });
        function resize() {
          modalBackdrop.sync();
          const viewport = window.ProductViewport?.measure() || { width: innerWidth, height: innerHeight, safe: { top: 0, right: 0, bottom: 0, left: 0 } };
          for (const side of ["width", "height"]) if (host.style[side] !== viewport[side] + "px") host.style[side] = viewport[side] + "px";
          const apply = (geometry) => window.ProductViewport?.applyLayout ? window.ProductViewport.applyLayout(screen, geometry) : Object.assign(screen.style, geometry);
          if (viewportModal) {
            const modalViewport = window.ProductViewport?.measure() || { width: innerWidth, height: innerHeight, safe: { top: 0, right: 0, bottom: 0, left: 0 } };
            const safe2 = modalViewport.safe || { top: 0, right: 0, bottom: 0, left: 0 }, width2 = Math.max(1, modalViewport.width - safe2.left - safe2.right), height2 = Math.max(1, modalViewport.height - safe2.top - safe2.bottom), portrait2 = height2 > width2;
            const applyModal = (element, geometry) => window.ProductViewport?.applyLayout ? window.ProductViewport.applyLayout(element, geometry) : Object.assign(element.style, geometry);
            screen.classList.toggle("portrait", portrait2);
            screen.style.setProperty("--modal-viewport-height", modalViewport.height + "px");
            applyModal(screen, { left: "0px", top: "0px", width: modalViewport.width + "px", height: modalViewport.height + "px", transform: "none", zoom: "1" });
            const dialog = screen.querySelector("dialog[open]");
            if (!dialog) return;
            const pageScale = Math.min(width2 / (portrait2 ? 540 : 960), height2 / (portrait2 ? 960 : 540));
            let scale2 = Math.max(0.1, Math.min(Math.max(1, pageScale), (width2 - 32) / (dialog.offsetWidth + 28)));
            const maxHeight = Math.max(64, (height2 - 32) / scale2 - 28), content = dialog.querySelector(".game-settings-panel");
            if (dialog.style.maxHeight !== maxHeight + "px") dialog.style.maxHeight = maxHeight + "px";
            if (content) {
              const body = content.parentElement, css = getComputedStyle(body), frame = getComputedStyle(dialog), number = (value) => parseFloat(value) || 0;
              const natural = dialog.querySelector(".dialog-head").offsetHeight + content.scrollHeight + number(css.paddingTop) + number(css.paddingBottom) + number(frame.borderTopWidth) + number(frame.borderBottomWidth);
              const bodyHeight = Math.min(natural, maxHeight) + "px";
              if (dialog.style.height !== bodyHeight) dialog.style.height = bodyHeight;
            }
            scale2 = Math.max(0.1, Math.min(scale2, (height2 - 32) / (dialog.offsetHeight + 28)));
            applyModal(dialog, { left: safe2.left + width2 / 2 + "px", top: safe2.top + height2 / 2 + "px", transform: "translate(-50%,-50%) scale(" + scale2 + ")", zoom: "1" });
            return;
          }
          const safe = viewport.safe, width = viewport.width - (fullBleed ? 0 : safe.left + safe.right), height = viewport.height - (fullBleed ? 0 : safe.top + safe.bottom), portrait = height > width, scale = Math.min(width / (portrait ? 540 : 960), height / (portrait ? 960 : 540));
          screen.classList.toggle("portrait", portrait);
          for (const side of ["top", "right", "bottom", "left"]) screen.style.setProperty("--ui-safe-" + side, safe[side] / scale + "px");
          apply({ left: (fullBleed ? 0 : safe.left) + "px", top: (fullBleed ? 0 : safe.top) + "px", width: width / scale + "px", height: height / scale + "px", transform: `scale(${scale})`, zoom: "1" });
          if (notification && typeof host.showPopover !== "function") refreshNotifications(true);
        }
        addEventListener("resize", resize);
        addEventListener("product-viewport-resize", resize);
        resize();
        for (const type of ["pointerdown", "pointermove", "pointerup", "click", "touchstart", "touchend", "wheel"]) host.addEventListener(type, (e) => e.stopPropagation());
        return { host, screen, resize, destroy() {
          notificationObserver?.disconnect();
          const stack = notificationStack();
          stack.hosts.delete(host);
          stack.modals.delete(host);
          if (typeof host.showPopover === "function" && host.matches(":popover-open")) host.hidePopover();
          if (stack.hosts.size) refreshNotifications();
          else {
            document.removeEventListener("fullscreenchange", stack.fullscreenHandler);
            stack.fullscreenHandler = null;
          }
          unbindInteraction?.();
          modalBackdrop.destroy();
          removeEventListener("resize", resize);
          removeEventListener("product-viewport-resize", resize);
          host.remove();
        } };
      }
      module.exports = { createVisualLayer, nativeNotificationModalChanged };
    }
  });

  // apps/three-game/product/settings-scroll.cjs
  var require_settings_scroll = __commonJS({
    "apps/three-game/product/settings-scroll.cjs"(exports, module) {
      "use strict";
      function attachSettingsScroll(dialog) {
        const body = dialog.querySelector(".dialog-body"), content = body.querySelector(".game-settings-panel");
        if (!content) return { update() {
        }, destroy() {
        } };
        const track = document.createElement("div"), thumb = document.createElement("span");
        body.id = "settings-scroll-content";
        track.className = "settings-scrollbar";
        track.setAttribute("role", "scrollbar");
        track.setAttribute("aria-controls", body.id);
        track.setAttribute("aria-label", "\u6EDA\u52A8\u6E38\u620F\u8BBE\u7F6E");
        track.setAttribute("aria-orientation", "vertical");
        track.tabIndex = 0;
        track.append(thumb);
        dialog.append(track);
        body.classList.add("settings-scroll-body");
        let touch = null, drag = null, suppressClickUntil = 0;
        function update() {
          const max = body.scrollHeight - body.clientHeight, overflow = max > 1;
          track.hidden = !overflow;
          track.style.top = body.offsetTop + 6 + "px";
          track.style.height = Math.max(0, body.clientHeight - 12) + "px";
          track.setAttribute("aria-valuemin", "0");
          track.setAttribute("aria-valuemax", String(Math.max(0, max)));
          track.setAttribute("aria-valuenow", String(Math.round(body.scrollTop)));
          if (!overflow) return;
          const height = Math.max(28, track.clientHeight * body.clientHeight / body.scrollHeight);
          thumb.style.height = height + "px";
          thumb.style.transform = `translateY(${(track.clientHeight - height) * body.scrollTop / max}px)`;
        }
        function start(event) {
          suppressClickUntil = 0;
          if (event.touches.length !== 1 || event.target.closest("input[type=range]")) {
            touch = null;
            return;
          }
          const point = event.touches[0];
          touch = { id: point.identifier, x: point.clientX, y: point.clientY, scroll: body.scrollTop, moved: false };
        }
        function move(event) {
          if (!touch || event.touches.length !== 1) return;
          const point = Array.from(event.touches).find((p) => p.identifier === touch.id);
          if (!point) return;
          const dx = point.clientX - touch.x, dy = point.clientY - touch.y;
          if (!touch.moved && Math.abs(dy) > 6 && Math.abs(dy) > Math.abs(dx)) touch.moved = true;
          if (!touch.moved) return;
          event.preventDefault();
          body.scrollTop = touch.scroll - dy / Math.max(0.1, body.getBoundingClientRect().height / Math.max(1, body.clientHeight));
          suppressClickUntil = performance.now() + 500;
          update();
        }
        function end() {
          touch = null;
        }
        function click(event) {
          if (performance.now() < suppressClickUntil) {
            event.preventDefault();
            event.stopImmediatePropagation();
          }
        }
        function pointerDown(event) {
          if (event.button !== 0) return;
          event.preventDefault();
          const rect = track.getBoundingClientRect(), height = thumb.getBoundingClientRect().height, max = body.scrollHeight - body.clientHeight;
          if (event.target !== thumb) body.scrollTop = (event.clientY - rect.top - height / 2) / Math.max(1, rect.height - height) * max;
          drag = { id: event.pointerId, y: event.clientY, scroll: body.scrollTop };
          track.setPointerCapture(event.pointerId);
          update();
        }
        function pointerMove(event) {
          if (!drag || event.pointerId !== drag.id) return;
          event.preventDefault();
          body.scrollTop = drag.scroll + (event.clientY - drag.y) * (body.scrollHeight - body.clientHeight) / Math.max(1, track.getBoundingClientRect().height - thumb.getBoundingClientRect().height);
          update();
        }
        function pointerEnd(event) {
          if (drag?.id !== event.pointerId) return;
          drag = null;
          if (track.hasPointerCapture(event.pointerId)) track.releasePointerCapture(event.pointerId);
        }
        function key(event) {
          const actions = { ArrowDown: 40, ArrowUp: -40, PageDown: body.clientHeight, PageUp: -body.clientHeight, Home: -body.scrollHeight, End: body.scrollHeight };
          if (!(event.key in actions)) return;
          event.preventDefault();
          body.scrollTop += actions[event.key];
          update();
        }
        function wheel(event) {
          event.preventDefault();
          body.scrollTop += event.deltaY * (event.deltaMode === 1 ? 20 : event.deltaMode === 2 ? body.clientHeight : 1);
          update();
        }
        body.addEventListener("touchstart", start, { passive: true });
        body.addEventListener("touchmove", move, { passive: false });
        body.addEventListener("touchend", end);
        body.addEventListener("touchcancel", end);
        body.addEventListener("click", click, true);
        body.addEventListener("scroll", update, { passive: true });
        track.addEventListener("pointerdown", pointerDown);
        track.addEventListener("pointermove", pointerMove);
        track.addEventListener("pointerup", pointerEnd);
        track.addEventListener("pointercancel", pointerEnd);
        track.addEventListener("keydown", key);
        track.addEventListener("wheel", wheel, { passive: false });
        const observer = new ResizeObserver(update);
        observer.observe(body);
        observer.observe(content);
        update();
        return { update, destroy() {
          observer.disconnect();
          body.removeEventListener("touchstart", start);
          body.removeEventListener("touchmove", move);
          body.removeEventListener("touchend", end);
          body.removeEventListener("touchcancel", end);
          body.removeEventListener("click", click, true);
          body.removeEventListener("scroll", update);
          track.remove();
        } };
      }
      module.exports = { attachSettingsScroll };
    }
  });

  // apps/three-game/product/operation-layout-setting.cjs
  var require_operation_layout_setting = __commonJS({
    "apps/three-game/product/operation-layout-setting.cjs"(exports, module) {
      "use strict";
      var preferences = require_device_preferences();
      var settings = () => window.SnookerPracticeSettings ||= preferences;
      var options = [["desktop", "\u684C\u9762"], ["mobile", "\u79FB\u52A8"]];
      function row(disabled = false) {
        const selected = settings().read().operationLayout || preferences.deviceType(navigator);
        return `<div class="row"><span>\u64CD\u4F5C\u5E03\u5C40</span><div class="settings-segment" role="group" aria-label="\u64CD\u4F5C\u5E03\u5C40">${options.map(([value, label]) => `<button type="button" data-operation-layout="${value}" aria-pressed="${selected === value}" class="${selected === value ? "active" : ""}" ${disabled ? "disabled" : ""}>${label}</button>`).join("")}</div></div>`;
      }
      function select(button, notice) {
        const { values, persisted } = settings().set("operationLayout", button.dataset.operationLayout);
        for (const item of button.parentElement.querySelectorAll("button")) {
          const active = item.dataset.operationLayout === values.operationLayout;
          item.setAttribute("aria-pressed", String(active));
          item.classList.toggle("active", active);
        }
        if (!persisted) notice?.("\u5F53\u524D\u6D4F\u89C8\u5668\u672A\u80FD\u4FDD\u5B58\u8BBE\u7F6E");
      }
      module.exports = { row, select };
    }
  });

  // apps/three-game/product/settings-tabs.cjs
  var require_settings_tabs = __commonJS({
    "apps/three-game/product/settings-tabs.cjs"(exports, module) {
      "use strict";
      var categories = [["operation", "\u64CD\u4F5C"], ["display", "\u753B\u9762"], ["sound", "\u58F0\u97F3"], ["interaction", "\u4E92\u52A8"]];
      var style = `<style>
.game-settings-panel[data-settings-groups] .settings-category-tabs{
 display:grid;grid-auto-flow:column;grid-auto-columns:minmax(0,1fr);gap:4px;
 margin:0 0 8px;padding:4px;border:1px solid #ffffff22;border-radius:9px;background:#131e26;
}
#screen .settings-category-tabs>button[role=tab]{
 min-width:0;min-height:40px;padding:4px;border:1px solid transparent;border-radius:6px;
 background:transparent;box-shadow:none;color:#b9c9d2;font:inherit;font-weight:600;
}
#screen .settings-category-tabs>button[role=tab]:hover{background:#ffffff0f;color:#fff}
#screen .settings-category-tabs>button[role=tab][aria-selected=true]{background:#20583e;border-color:#4d946c;color:#f2fff6}
#screen .settings-category-tabs>button:focus-visible{outline:2px solid #9ae8b6;outline-offset:-3px}
.settings-category-panels{min-height:calc(var(--settings-max-rows)*56px)}
.settings-category-panels>[hidden]{display:none!important}
.settings-scroll-body .settings-category-tabs{position:sticky;top:0;z-index:1}
</style>`;
      function render(groups, { id, selected = "operation" }) {
        const available = categories.filter(([key]) => groups[key]?.length);
        if (!available.some(([key]) => key === selected)) selected = available[0][0];
        const maxRows = Math.max(...available.map(([key]) => groups[key].length));
        return `<div class="game-settings-panel" data-settings-groups>${style}<div class="settings-category-tabs" role="tablist" aria-label="\u6E38\u620F\u8BBE\u7F6E\u5206\u7C7B">${available.map(([key, label]) => `<button type="button" role="tab" data-settings-tab="${key}" id="${id}-tab-${key}" aria-controls="${id}-panel-${key}" aria-selected="${key === selected}" tabindex="${key === selected ? 0 : -1}">${label}</button>`).join("")}</div><div class="settings-category-panels" style="--settings-max-rows:${maxRows}">${available.map(([key]) => `<section class="game-settings-panel" role="tabpanel" data-settings-category="${key}" id="${id}-panel-${key}" aria-labelledby="${id}-tab-${key}" ${key === selected ? "" : "hidden"}>${groups[key].join("")}</section>`).join("")}</div></div>`;
      }
      function activate(button) {
        const key = button.dataset.settingsTab;
        for (const tab of button.parentElement.querySelectorAll("[data-settings-tab]")) {
          const selected = tab === button;
          tab.setAttribute("aria-selected", String(selected));
          tab.tabIndex = selected ? 0 : -1;
        }
        for (const panel of button.closest("[data-settings-groups]").querySelectorAll("[data-settings-category]")) {
          panel.hidden = panel.dataset.settingsCategory !== key;
        }
        return key;
      }
      function handleKey(event) {
        const button = event.target.closest?.("[data-settings-tab]");
        if (!button) return;
        const tabs = Array.from(button.parentElement.querySelectorAll("[data-settings-tab]"));
        const index = tabs.indexOf(button);
        let next;
        switch (event.key) {
          case "ArrowRight":
            next = (index + 1) % tabs.length;
            break;
          case "ArrowLeft":
            next = (index + tabs.length - 1) % tabs.length;
            break;
          case "Home":
            next = 0;
            break;
          case "End":
            next = tabs.length - 1;
            break;
          default:
            return;
        }
        event.preventDefault();
        tabs[next].click();
        tabs[next].focus();
      }
      module.exports = { render, activate, handleKey };
    }
  });

  // apps/three-game/src/game-client/quickChat.js
  var require_quickChat = __commonJS({
    "apps/three-game/src/game-client/quickChat.js"(exports, module) {
      var QUICK_CHAT_MESSAGES = Object.freeze([
        "\u4F60\u597D\uFF01",
        "\u597D\u7403\uFF01",
        "\u8C22\u8C22\uFF5E",
        "\u8FD0\u6C14\uFF5E",
        "\u4F60\u592A\u5389\u5BB3\u4E86\uFF01",
        "\u592A\u6FC0\u8FDB\u5566\uFF5E",
        "\u53EF\u60DC\u4E86",
        "\u627F\u8BA9\u4E86",
        "\u518D\u6765\u4E00\u5C40\uFF01",
        "\u4E0B\u6B21\u518D\u6218\uFF01"
      ]);
      var MAX_QUICK_CHAT_MESSAGE_LENGTH = 40;
      function limitQuickChatEdit(previous, next) {
        const before = Array.from(String(previous || ""));
        const after = Array.from(String(next || "").replace(/[\r\n\t]/g, " "));
        if (after.length <= MAX_QUICK_CHAT_MESSAGE_LENGTH) return after.join("");
        let start = 0, end = 0;
        while (start < before.length && start < after.length && before[start] === after[start]) start++;
        while (end < before.length - start && end < after.length - start && before[before.length - 1 - end] === after[after.length - 1 - end]) end++;
        const remaining = Math.max(0, MAX_QUICK_CHAT_MESSAGE_LENGTH - start - end);
        return [
          ...after.slice(0, start),
          ...after.slice(start, after.length - end).slice(0, remaining),
          ...end ? after.slice(-end) : []
        ].slice(0, MAX_QUICK_CHAT_MESSAGE_LENGTH).join("");
      }
      function normalizeQuickChatMessage(message) {
        return String(message || "").replace(/[\r\n\t]+/g, " ").trim();
      }
      function quickChatMessageLength(message) {
        return [...normalizeQuickChatMessage(message)].length;
      }
      function isAllowedQuickChatMessage(message) {
        const normalized = normalizeQuickChatMessage(message);
        const length = quickChatMessageLength(normalized);
        return length > 0 && length <= MAX_QUICK_CHAT_MESSAGE_LENGTH;
      }
      module.exports = {
        MAX_QUICK_CHAT_MESSAGE_LENGTH,
        limitQuickChatEdit,
        QUICK_CHAT_MESSAGES,
        isAllowedQuickChatMessage,
        normalizeQuickChatMessage,
        quickChatMessageLength
      };
    }
  });

  // apps/three-game/src/game-client/chatPanelState.js
  var require_chatPanelState = __commonJS({
    "apps/three-game/src/game-client/chatPanelState.js"(exports, module) {
      var { normalizeQuickChatMessage, isAllowedQuickChatMessage, limitQuickChatEdit } = require_quickChat();
      function createChatPanelState({ limit = 100 } = {}) {
        const state = { tab: "quick", messages: [], draft: "", scroll: 0, status: "", focused: false, caret: true, caretIndex: 0 };
        let roomId = "";
        let chatSessionId = "";
        function syncRoom(nextId = "", nextChatSessionId = "") {
          const normalizedRoomId = String(nextId || "");
          const normalizedChatSessionId = String(nextChatSessionId || normalizedRoomId);
          if (roomId === normalizedRoomId && chatSessionId === normalizedChatSessionId) return;
          roomId = normalizedRoomId;
          chatSessionId = normalizedChatSessionId;
          Object.assign(state, {
            tab: "quick",
            messages: [],
            draft: "",
            scroll: 0,
            status: "",
            focused: false,
            caretIndex: 0,
            selectionStart: 0,
            selectionEnd: 0,
            inputScrollLeft: 0
          });
        }
        function compareMessages(left, right) {
          const leftSeq = Number(left?.seq);
          const rightSeq = Number(right?.seq);
          if (Number.isFinite(leftSeq) && Number.isFinite(rightSeq) && leftSeq !== rightSeq) return leftSeq - rightSeq;
          return (Number(left?.sentAt) || 0) - (Number(right?.sentAt) || 0);
        }
        function receive(message) {
          const text = normalizeQuickChatMessage(message.text);
          if (!roomId || !isAllowedQuickChatMessage(text)) return false;
          const id = String(message.id || "");
          if (id && state.messages.some((candidate) => candidate.id === id)) return false;
          state.messages.push({ ...message, ...id ? { id } : {}, text });
          state.messages.sort(compareMessages);
          if (state.messages.length > limit) state.messages.splice(0, state.messages.length - limit);
          state.scroll = Number.MAX_SAFE_INTEGER;
          return true;
        }
        function mergeHistory(messages = []) {
          let changed = false;
          [...messages].sort(compareMessages).forEach((message) => {
            changed = receive(message) || changed;
          });
          return changed;
        }
        function setDraft(value, caretIndex) {
          state.draft = limitQuickChatEdit(state.draft, value);
          state.caretIndex = Math.min(caretIndex ?? state.draft.length, state.draft.length);
          state.selectionStart = state.caretIndex;
          state.selectionEnd = state.caretIndex;
          state.caret = true;
          state.status = "";
        }
        return {
          state,
          syncRoom,
          receive,
          mergeHistory,
          setDraft,
          getRoomId: () => roomId,
          getChatSessionId: () => chatSessionId
        };
      }
      module.exports = { createChatPanelState };
    }
  });

  // apps/three-game/src/core/progression/playerLevelProgression.js
  var require_playerLevelProgression = __commonJS({
    "apps/three-game/src/core/progression/playerLevelProgression.js"(exports, module) {
      var PLAYER_LEVEL_TIER_NAMES = Object.freeze([
        "\u4E1A\u4F59\u65B0\u624B",
        "\u6F5C\u529B\u65B0\u79C0",
        "\u8FDB\u9636\u7403\u624B",
        "\u4E1A\u4F59\u9AD8\u624B",
        "\u804C\u4E1A\u65B0\u79C0",
        "\u8D5B\u573A\u4E2D\u575A",
        "\u804C\u4E1A\u9AD8\u624B",
        "\u8D5B\u573A\u8D62\u5BB6",
        "\u9876\u5C16\u5927\u5E08",
        "\u4F20\u5947\u5DE8\u661F"
      ]);
      function playerLevel(value) {
        return Math.max(1, Math.min(99, Math.floor(Number(value) || 1)));
      }
      function playerLevelTierIndex(value) {
        const level = playerLevel(value);
        return level < 10 ? 0 : Math.min(9, Math.floor(level / 10));
      }
      function playerLevelTierName(value) {
        return PLAYER_LEVEL_TIER_NAMES[playerLevelTierIndex(value)];
      }
      module.exports = {
        PLAYER_LEVEL_TIER_NAMES,
        playerLevel,
        playerLevelTierIndex,
        playerLevelTierName
      };
    }
  });

  // apps/three-game/src/config/playerNickname.js
  var require_playerNickname = __commonJS({
    "apps/three-game/src/config/playerNickname.js"(exports, module) {
      var MAX_NICKNAME_WIDTH_UNITS = 12;
      function isWideNicknameCharacter(character) {
        const codePoint = String(character || "").codePointAt(0);
        if (!Number.isFinite(codePoint)) return false;
        if (codePoint > 65535) return true;
        return codePoint >= 11904 && codePoint <= 12351 || codePoint >= 12352 && codePoint <= 12543 || codePoint >= 12784 && codePoint <= 12799 || codePoint >= 13312 && codePoint <= 19903 || codePoint >= 19968 && codePoint <= 40959 || codePoint >= 44032 && codePoint <= 55215 || codePoint >= 63744 && codePoint <= 64255 || codePoint >= 65281 && codePoint <= 65376 || codePoint >= 65504 && codePoint <= 65510;
      }
      function nicknameCharacterWidthUnits(character) {
        return isWideNicknameCharacter(character) ? 2 : 1;
      }
      function nicknameWidthUnits(value) {
        return Array.from(String(value || "")).reduce(
          (total, character) => total + nicknameCharacterWidthUnits(character),
          0
        );
      }
      function nicknameFitsWidthLimit(value, maxUnits = MAX_NICKNAME_WIDTH_UNITS) {
        return nicknameWidthUnits(value) <= maxUnits;
      }
      function truncateNicknameToWidth(value, maxUnits = MAX_NICKNAME_WIDTH_UNITS) {
        let result = "";
        let usedUnits = 0;
        for (const character of Array.from(String(value || ""))) {
          const characterUnits = nicknameCharacterWidthUnits(character);
          if (usedUnits + characterUnits > maxUnits) break;
          result += character;
          usedUnits += characterUnits;
        }
        return result;
      }
      module.exports = {
        MAX_NICKNAME_WIDTH_UNITS,
        nicknameCharacterWidthUnits,
        nicknameFitsWidthLimit,
        nicknameWidthUnits,
        truncateNicknameToWidth
      };
    }
  });

  // apps/three-game/src/game-client/render/playerProfilePanelRenderer.js
  var require_playerProfilePanelRenderer = __commonJS({
    "apps/three-game/src/game-client/render/playerProfilePanelRenderer.js"(exports, module) {
      var { nicknameCharacterWidthUnits } = require_playerNickname();
      var FONT = "system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
      function playerOnlineStatItems(onlineStats = {}) {
        const percent = (value) => Number.isFinite(Number(value)) ? `${Math.round(Number(value) * 100)}%` : "\u2014";
        return [
          ["\u5355\u6746\u6700\u9AD8\u5206", Math.max(0, Number(onlineStats.highestBreak) || 0)],
          ["\u5355\u6746147", Math.max(0, Number(onlineStats.maximum147s) || 0)],
          ["\u5355\u6746\u7834\u767E", Math.max(0, Number(onlineStats.centuries) || 0)],
          ["\u603B\u5C40\u6570", Math.max(0, Number(onlineStats.games) || 0)],
          ["\u80DC\u7387", Number(onlineStats.games) > 0 && Number.isFinite(Number(onlineStats.winRate)) ? `${Math.round(Number(onlineStats.winRate) * 100)}%` : "\u2014"],
          ["\u8FDB\u7403\u6210\u529F\u7387", percent(onlineStats.attackSuccessRate)],
          ["\u5B89\u5168\u7403\u6210\u529F\u7387", percent(onlineStats.safetySuccessRate)],
          ["\u6389\u7EBF\u7387", percent(onlineStats.disconnectRate)]
        ];
      }
      function resolveProfileSocialActions({ friendStatus = "", hasUser = true, isBlocked = false } = {}) {
        if (!hasUser || !friendStatus) return [];
        if (isBlocked || friendStatus === "blocked") {
          return [{ id: "social-unblock", label: "\u89E3\u9664\u62C9\u9ED1", action: "unblock" }];
        }
        if (friendStatus === "friend") {
          return [
            { id: "social-remove", label: "\u5220\u9664\u597D\u53CB", action: "remove-friend" },
            { id: "social-block", label: "\u62C9\u9ED1", action: "block" }
          ];
        }
        if (friendStatus === "pending") {
          return [
            { id: "social-pending", label: "\u5DF2\u7533\u8BF7", action: "", enabled: false },
            { id: "social-block", label: "\u62C9\u9ED1", action: "block" }
          ];
        }
        return [
          { id: "social-add", label: "\u52A0\u597D\u53CB", action: "add-friend" },
          { id: "social-block", label: "\u62C9\u9ED1", action: "block" }
        ];
      }
      function drawProfileHeaderActions(ctx, {
        actions = [],
        left = null,
        right = 0,
        y = 0,
        scale = 1,
        hoveredButtonId = null,
        pressedButtonId = null
      } = {}) {
        const buttons = [];
        const fromLeft = Number.isFinite(Number(left));
        let actionEdge = fromLeft ? Number(left) : right;
        const orderedActions = fromLeft ? actions : actions.slice().reverse();
        orderedActions.forEach((action) => {
          const buttonWidth = (action.label.length > 3 ? 78 : 62) * scale;
          const button = {
            ...action,
            x: fromLeft ? actionEdge : actionEdge - buttonWidth,
            y,
            width: buttonWidth,
            height: 36 * scale
          };
          actionEdge = fromLeft ? button.x + button.width + 8 * scale : button.x - 8 * scale;
          if (fromLeft) buttons.push(button);
          else buttons.unshift(button);
        });
        buttons.forEach((button) => {
          const disabled = button.enabled === false;
          const hovered = !disabled && hoveredButtonId === button.id;
          const pressed = !disabled && pressedButtonId === button.id;
          ctx.fillStyle = disabled ? "rgba(255,255,255,0.035)" : pressed ? "rgba(203,167,84,0.30)" : hovered ? "rgba(203,167,84,0.22)" : "rgba(255,255,255,0.07)";
          ctx.strokeStyle = hovered ? "rgba(238,207,132,0.70)" : "rgba(255,255,255,0.14)";
          ctx.lineWidth = Math.max(1, scale);
          ctx.beginPath();
          ctx.roundRect?.(button.x, button.y, button.width, button.height, 8 * scale);
          if (typeof ctx.roundRect !== "function") ctx.rect(button.x, button.y, button.width, button.height);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = disabled ? "rgba(248,241,219,0.38)" : button.action === "add-friend" ? "#efd28a" : "#f8f1db";
          ctx.font = `650 ${13 * scale}px ${FONT}`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(button.label, button.x + button.width / 2, button.y + button.height / 2);
        });
        return {
          buttons,
          left: buttons[0]?.x ?? (fromLeft ? Number(left) : actionEdge),
          right: buttons.at(-1) ? buttons.at(-1).x + buttons.at(-1).width : fromLeft ? actionEdge : right
        };
      }
      function profileHeaderActionsWidth(actions = [], scale = 1) {
        if (!actions.length) return 0;
        return actions.reduce((sum, action) => sum + (action.label.length > 3 ? 78 : 62) * scale, 0) + (actions.length - 1) * 8 * scale;
      }
      function profileDisplayName(ctx, name, maxWidth, maxCharacters = 6) {
        const characters = Array.from(String(name || "\u73A9\u5BB6"));
        const maxUnits = Math.max(2, Number(maxCharacters) * 2);
        const cappedCharacters = [];
        let usedUnits = 0;
        characters.some((character) => {
          const characterUnits = nicknameCharacterWidthUnits(character);
          if (usedUnits + characterUnits > maxUnits) return true;
          cappedCharacters.push(character);
          usedUnits += characterUnits;
          return false;
        });
        const capped = cappedCharacters.join("");
        if (ctx.measureText(capped).width <= maxWidth) return capped;
        const visible = [...cappedCharacters];
        while (visible.length > 1 && ctx.measureText(`${visible.join("")}\u2026`).width > maxWidth) {
          visible.pop();
        }
        return `${visible.join("")}\u2026`;
      }
      function drawPlayerProfileStats(ctx, {
        panel,
        onlineStats = {},
        scale = 1,
        titleY = panel.y + 104 * scale,
        firstValueY = panel.y + 155 * scale,
        rowGap = 82 * scale,
        horizontalInset = 16 * scale,
        titleFontSize = 16,
        valueFontSize = 21,
        labelFontSize = 13,
        titleColor = "rgba(248, 241, 219, 0.82)",
        valueColor = "#f8f1db",
        labelColor = "rgba(248, 241, 219, 0.58)"
      } = {}) {
        if (!panel) return [];
        const title = "\u5728\u7EBF\u5BF9\u6218\u7EDF\u8BA1";
        ctx.fillStyle = titleColor;
        ctx.font = `700 ${titleFontSize * scale}px ${FONT}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(title, panel.x + panel.width / 2, titleY);
        const titleWidth = ctx.measureText(title).width;
        const dividerGap = 14 * scale;
        const dividerInset = 20 * scale;
        ctx.strokeStyle = "rgba(248, 241, 219, 0.18)";
        ctx.lineWidth = Math.max(1, scale);
        ctx.beginPath();
        ctx.moveTo(panel.x + dividerInset, titleY);
        ctx.lineTo(panel.x + panel.width / 2 - titleWidth / 2 - dividerGap, titleY);
        ctx.moveTo(panel.x + panel.width / 2 + titleWidth / 2 + dividerGap, titleY);
        ctx.lineTo(panel.x + panel.width - dividerInset, titleY);
        ctx.stroke();
        const stats = playerOnlineStatItems(onlineStats);
        const columns = 4;
        const statWidth = (panel.width - horizontalInset * 2) / columns;
        stats.forEach(([label, value], index) => {
          const column = index % columns;
          const row = Math.floor(index / columns);
          const rowCount = Math.min(columns, stats.length - row * columns);
          const rowOffset = (columns - rowCount) * 0.5;
          const centerX = panel.x + horizontalInset + statWidth * (column + rowOffset + 0.5);
          const valueY = firstValueY + row * rowGap;
          ctx.fillStyle = valueColor;
          ctx.font = `750 ${valueFontSize * scale}px ${FONT}`;
          ctx.textAlign = "center";
          ctx.fillText(String(value), centerX, valueY);
          ctx.fillStyle = labelColor;
          ctx.font = `500 ${labelFontSize * scale}px ${FONT}`;
          ctx.fillText(label, centerX, valueY + 28 * scale);
        });
        return stats;
      }
      module.exports = {
        drawProfileHeaderActions,
        drawPlayerProfileStats,
        playerOnlineStatItems,
        profileDisplayName,
        profileHeaderActionsWidth,
        resolveProfileSocialActions
      };
    }
  });

  // apps/three-game/online/panels.cjs
  var require_panels = __commonJS({
    "apps/three-game/online/panels.cjs"(exports, module) {
      var { QUICK_CHAT_MESSAGES, MAX_QUICK_CHAT_MESSAGE_LENGTH, isAllowedQuickChatMessage, normalizeQuickChatMessage } = require_quickChat();
      var { createChatPanelState } = require_chatPanelState();
      var { playerLevelTierName } = require_playerLevelProgression();
      function createPanels(api) {
        const layer = document.createElement("div");
        layer.id = "online-panels";
        layer.hidden = true;
        const card = document.createElement("section");
        card.className = "online-panel";
        card.setAttribute("role", "dialog");
        card.setAttribute("aria-modal", "true");
        card.tabIndex = -1;
        layer.append(card);
        function layout() {
          if (!window.ProductViewport) return;
          const { width, height, safe } = window.ProductViewport.measure();
          Object.assign(layer.style, { width: width + "px", height: height + "px", padding: `${16 + safe.top}px ${16 + safe.right}px ${16 + safe.bottom}px ${16 + safe.left}px` });
          card.style.maxHeight = height - safe.top - safe.bottom - 32 + "px";
        }
        addEventListener("resize", layout);
        addEventListener("product-viewport-resize", layout);
        addEventListener("pagehide", () => {
          removeEventListener("resize", layout);
          removeEventListener("product-viewport-resize", layout);
        }, { once: true });
        layout();
        let kind = "", playerId = "", confirmResolve = null, chatPending = null, chatRevision = 0;
        const chatModel = createChatPanelState();
        const el = (tag, text, cls) => {
          const e = document.createElement(tag);
          if (text !== void 0) e.textContent = text;
          if (cls) e.className = cls;
          return e;
        };
        const button = (label, action, cls = "") => {
          const b = el("button", label, cls);
          b.type = "button";
          b.onclick = () => Promise.resolve(action()).catch((e) => api.notice(e.message));
          return b;
        };
        function close() {
          chatRevision++;
          if (kind === "lobby" && api.returnToLegacyLobby !== false) return;
          layer.hidden = true;
          kind = "";
          if (confirmResolve) {
            confirmResolve(false);
            confirmResolve = null;
          }
          if (!api.room() && api.returnToLegacyLobby !== false) lobby();
        }
        function shell(title, type) {
          layout();
          chatRevision++;
          if (confirmResolve) {
            confirmResolve(false);
            confirmResolve = null;
          }
          kind = type;
          layer.hidden = false;
          card.replaceChildren();
          const h = el("header");
          h.append(el("h2", title));
          if (type !== "lobby") h.append(button("\u5173\u95ED", close, "online-close"));
          card.append(h);
          card.focus();
        }
        function row(label, control) {
          const r = el("label", void 0, "online-setting");
          r.append(el("span", label), control);
          card.append(r);
        }
        function toggle(label, key) {
          const input = el("input");
          input.type = "checkbox";
          input.checked = api.preferences()[key] !== false;
          input.onchange = async () => {
            input.disabled = true;
            try {
              await api.setPreference(key, input.checked);
            } catch (error) {
              input.checked = api.preferences()[key] !== false;
              api.notice(error.message || "\u8BBE\u7F6E\u4FDD\u5B58\u5931\u8D25");
            } finally {
              input.disabled = false;
            }
          };
          row(label, input);
        }
        function settings() {
          shell("\u8BBE\u7F6E", "settings");
          const profile2 = api.profile();
          const identity = el("div", void 0, "online-profile-edit");
          const avatar = el("img");
          avatar.alt = "\u6211\u7684\u5934\u50CF";
          avatar.src = profile2.avatarSrc || "/online/avatars/cartoon-player-a.png";
          identity.append(avatar);
          const name = el("input");
          name.value = profile2.nickname || "";
          name.setAttribute("aria-label", "\u6635\u79F0");
          name.maxLength = 24;
          identity.append(name, button("\u4FDD\u5B58\u6635\u79F0", () => api.updateProfile({ nickname: name.value })));
          card.append(identity);
          const file = el("input");
          file.type = "file";
          file.accept = "image/*";
          file.setAttribute("aria-label", "\u66F4\u6362\u5934\u50CF");
          file.onchange = () => {
            const f = file.files[0];
            if (!f) return;
            if (f.size > 1024 * 1024) {
              api.notice("\u8BF7\u9009\u62E9\u4E0D\u8D85\u8FC7 1 MB \u7684\u5934\u50CF");
              return;
            }
            const reader = new FileReader();
            reader.onload = () => {
              const image = new Image();
              image.onerror = () => api.notice("\u65E0\u6CD5\u8BFB\u53D6\u8FD9\u5F20\u56FE\u7247");
              image.onload = () => {
                const canvas = document.createElement("canvas");
                canvas.width = canvas.height = 256;
                const ctx = canvas.getContext("2d"), side = Math.min(image.width, image.height);
                ctx.drawImage(image, (image.width - side) / 2, (image.height - side) / 2, side, side, 0, 0, 256, 256);
                api.updateProfile({ avatarSrc: canvas.toDataURL("image/jpeg", 0.85) }).then(() => {
                  if (kind === "settings") settings();
                }).catch((e) => api.notice(e.message));
              };
              image.src = reader.result;
            };
            reader.readAsDataURL(f);
          };
          row("\u66F4\u6362\u5934\u50CF", file);
          for (const [label, key] of [["\u63A5\u53D7\u5BF9\u6218\u9080\u8BF7", "acceptOnlineInvites"], ["\u5141\u8BB8\u89C2\u6218", "allowSpectators"], ["\u51FB\u7403\u97F3\u6548", "soundEnabled"], ["\u6BCD\u7403\u8F68\u8FF9", "cueTrajectoryVisible"], ["\u6253\u70B9\u8F85\u52A9\u653E\u5927", "tipMagnifierEnabled"]]) toggle(label, key);
          const voice = el("select");
          voice.setAttribute("aria-label", "\u62A5\u5206\u8BED\u8A00");
          for (const [value, label] of [["off", "\u5173\u95ED"], ["zh", "\u4E2D\u6587"], ["en", "\u82F1\u6587"]]) {
            const option = el("option", label);
            option.value = value;
            voice.append(option);
          }
          voice.value = api.preferences().scoreVoiceMode || "en";
          voice.onchange = () => api.setPreference("scoreVoiceMode", voice.value);
          row("\u62A5\u5206\u8BED\u8A00", voice);
          const actions = el("div", void 0, "online-panel-actions");
          actions.append(button("\u590D\u5236\u623F\u95F4\u94FE\u63A5", () => api.share()), button("\u597D\u53CB\u6D88\u606F", social));
          if (api.canConcede()) actions.append(button("\u8BA4\u8F93", () => api.concede(), "danger"));
          actions.append(button("\u8FD4\u56DE\u5927\u5385", () => api.leave()));
          card.append(actions);
        }
        async function profile(id) {
          playerId = id;
          shell("\u73A9\u5BB6\u8D44\u6599", "profile");
          const p = api.room()?.players.find((p2) => p2.playerId === id);
          if (!p) return;
          const head = el("div", void 0, "online-profile-edit"), img = el("img");
          img.alt = "\u73A9\u5BB6\u5934\u50CF";
          img.src = p.avatarSrc || `/online/avatars/cartoon-player-${id === "p1" ? "a" : "b"}.png`;
          head.append(img, el("h3", p.name), el("span", `${p.connected ? "\u5728\u7EBF" : "\u79BB\u7EBF"} \xB7 Lv.${p.onlineStats?.level || 1} ${playerLevelTierName(p.onlineStats?.level || 1)}`));
          card.append(head);
          const stats = p.onlineStats || {}, grid = el("dl", void 0, "online-profile-stats");
          for (const [label, value] of require_playerProfilePanelRenderer().playerOnlineStatItems(stats)) grid.append(el("dt", label), el("dd", String(value)));
          card.append(grid);
          if (p.playerId !== api.self()?.playerId && p.userId) {
            const state = await api.social();
            if (kind !== "profile" || playerId !== id) return;
            const blocked = state.blockedUserIds?.includes(p.userId), friend = state.friends?.some((f) => f.id === p.userId), pending = state.pendingOutgoingFriendUserIds?.includes(p.userId);
            card.append(button(blocked ? "\u53D6\u6D88\u62C9\u9ED1" : "\u62C9\u9ED1", async () => {
              await api.socialAction(blocked ? "unblock" : "block", { targetUserId: p.userId });
              profile(id);
            }));
            if (!blocked) {
              const b = button(friend ? "\u5220\u9664\u597D\u53CB" : pending ? "\u5DF2\u7533\u8BF7" : "\u6DFB\u52A0\u597D\u53CB", async () => {
                await api.socialAction(friend ? "friend-remove" : "friend-request", { targetUserId: p.userId });
                profile(id);
              });
              b.disabled = pending;
              card.append(b);
            }
          }
          if (api.canKick(id)) card.append(button("\u8BF7\u79BB\u623F\u95F4", async () => {
            if (await confirm("\u786E\u5B9A\u8BF7\u8FD9\u4F4D\u73A9\u5BB6\u79BB\u5F00\u623F\u95F4\u5417\uFF1F")) {
              await api.kick(id);
              close();
            }
          }, "danger"));
        }
        async function social() {
          shell("\u597D\u53CB\u6D88\u606F", "social");
          const state = await api.social();
          if (kind !== "social") return;
          for (const n of state.notifications || []) {
            const item = el("div", void 0, "online-social-item");
            item.append(el("p", n.message || `${n.actor?.nickname || "\u73A9\u5BB6"}\u7684\u597D\u53CB\u7533\u8BF7`));
            if (n.requestId && n.requestStatus === "pending") for (const [label, accept] of [["\u63A5\u53D7", true], ["\u62D2\u7EDD", false]]) item.append(button(label, async () => {
              await api.socialAction("friend-response", { requestId: n.requestId, accept });
              social();
            }));
            card.append(item);
          }
          if (!state.notifications?.length) card.append(el("p", "\u6682\u65E0\u65B0\u6D88\u606F"));
        }
        function syncChatRoom() {
          const room = api.room(), before = chatModel.getRoomId() + ":" + chatModel.getChatSessionId();
          chatModel.syncRoom(room?.roomId || "", room?.chatSessionId || "");
          if (before !== chatModel.getRoomId() + ":" + chatModel.getChatSessionId()) {
            chatRevision++;
            chatPending = null;
            if (kind === "chat") {
              const input = card.querySelector('[aria-label="\u804A\u5929\u5185\u5BB9"]');
              if (input) input.value = "";
              card.querySelectorAll(".online-quick-chat button,form button").forEach((b) => b.disabled = false);
              renderChat();
            }
          }
        }
        function renderChat() {
          if (kind !== "chat") return;
          const list = card.querySelector(".online-chat-history");
          list.replaceChildren();
          for (const m of chatModel.state.messages) list.append(el("p", `${m.name || m.playerName || m.playerId || "\u73A9\u5BB6"}\uFF1A${m.text}`));
          list.scrollTop = list.scrollHeight;
        }
        async function submitChat(value, clearDraft = false) {
          syncChatRoom();
          if (chatPending) return false;
          if (api.preferences().quickChatEnabled === false) {
            api.notice("\u5BF9\u8BDD\u529F\u80FD\u5DF2\u5173\u95ED");
            return false;
          }
          const message = normalizeQuickChatMessage(value);
          if (!isAllowedQuickChatMessage(message)) {
            api.notice(`\u8BF7\u8F93\u5165 1\uFF5E${MAX_QUICK_CHAT_MESSAGE_LENGTH} \u4E2A\u5B57\u7B26`);
            return false;
          }
          const roomId = chatModel.getRoomId(), sessionId = chatModel.getChatSessionId(), revision = chatRevision;
          if (!roomId) return false;
          const action = {};
          chatPending = action;
          const buttons = [...card.querySelectorAll(".online-quick-chat button,form button")];
          buttons.forEach((b) => b.disabled = true);
          try {
            const sent = await api.chat(message);
            if (sent === false) throw Error("\u53D1\u9001\u5931\u8D25\uFF0C\u8BF7\u91CD\u8BD5");
            syncChatRoom();
            if (roomId !== chatModel.getRoomId() || sessionId !== chatModel.getChatSessionId()) return false;
            if (clearDraft && chatModel.state.draft === value) {
              chatModel.setDraft("");
              if (kind === "chat" && revision === chatRevision) {
                const input = card.querySelector('[aria-label="\u804A\u5929\u5185\u5BB9"]');
                if (input) input.value = "";
              }
            }
            return true;
          } catch (error) {
            syncChatRoom();
            if (roomId === chatModel.getRoomId() && sessionId === chatModel.getChatSessionId()) api.notice(error.message || "\u53D1\u9001\u5931\u8D25\uFF0C\u8BF7\u91CD\u8BD5");
            return false;
          } finally {
            if (chatPending === action) {
              chatPending = null;
              buttons.forEach((b) => b.disabled = false);
            }
          }
        }
        function chat() {
          syncChatRoom();
          shell("\u804A\u5929", "chat");
          toggle("\u5F00\u542F\u5BF9\u8BDD", "quickChatEnabled");
          const list = el("div", void 0, "online-chat-history");
          list.setAttribute("aria-live", "polite");
          card.append(list);
          renderChat();
          const quick = el("div", void 0, "online-quick-chat");
          for (const text of QUICK_CHAT_MESSAGES) quick.append(button(text, () => submitChat(text)));
          card.append(quick);
          const form = el("form"), input = el("input");
          input.value = chatModel.state.draft;
          input.placeholder = "\u8F93\u5165\u6D88\u606F\uFF0C\u6700\u591A 40 \u5B57";
          input.setAttribute("aria-label", "\u804A\u5929\u5185\u5BB9");
          input.oninput = () => {
            chatModel.setDraft(input.value, input.selectionStart);
            if (input.value !== chatModel.state.draft) input.value = chatModel.state.draft;
          };
          const submit = el("button", "\u53D1\u9001");
          submit.type = "submit";
          form.append(input, submit);
          form.onsubmit = (e) => {
            e.preventDefault();
            submitChat(input.value, true);
          };
          card.append(form);
        }
        function confirm(text) {
          shell("\u786E\u8BA4", "confirm");
          card.append(el("p", text));
          return new Promise((resolve) => {
            confirmResolve = resolve;
            for (const [label, value] of [["\u53D6\u6D88", false], ["\u786E\u5B9A", true]]) card.append(button(label, () => {
              confirmResolve = null;
              resolve(value);
              close();
            }));
          });
        }
        function lobby(message = "") {
          shell("\u5728\u7EBF\u5BF9\u6218", "lobby");
          if (message) card.append(el("p", message));
          card.append(button("\u5728\u7EBF\u5339\u914D", async () => {
            kind = "";
            layer.hidden = true;
            await api.match();
          }), button("\u8BBE\u7F6E", settings));
        }
        for (const type of ["pointerdown", "pointermove", "pointerup", "pointercancel", "click", "dblclick", "wheel", "touchstart", "touchmove", "touchend"]) layer.addEventListener(type, (e) => e.stopPropagation(), { passive: true });
        layer.addEventListener("click", (e) => {
          if (e.target === layer) close();
        });
        layer.addEventListener("keydown", (e) => {
          e.stopPropagation();
          if (e.key === "Escape") close();
        });
        return {
          layer,
          settings,
          profile,
          chat,
          social,
          confirm,
          lobby,
          close,
          isOpen: () => !layer.hidden,
          syncChatRoom,
          receiveChat(payload, history2 = false) {
            syncChatRoom();
            if (!chatModel.getRoomId() || payload.roomId && payload.roomId !== chatModel.getRoomId() || String(payload.chatSessionId || "") !== chatModel.getChatSessionId()) return false;
            const messages = (history2 ? payload.messages || [] : [payload]).map((m) => ({ ...m, text: m.text ?? m.message }));
            const changed = chatModel.mergeHistory(messages);
            if (changed) renderChat();
            return changed;
          }
        };
      }
      module.exports = { createPanels };
    }
  });

  // apps/three-game/product/settings-range.cjs
  var require_settings_range = __commonJS({
    "apps/three-game/product/settings-range.cjs"(exports, module) {
      "use strict";
      function attachSettingsRanges(root) {
        let drag = null;
        function move(event) {
          if (!drag || event.pointerId !== drag.id) return;
          event.preventDefault();
          const { input, rect } = drag, min = Number(input.min) || 0, max = Number(input.max) || 100, step = Number(input.step) || 1;
          const radius = Math.min(9 * rect.width / Math.max(1, input.offsetWidth), rect.width / 2), ratio = Math.max(0, Math.min(1, (event.clientX - rect.left - radius) / Math.max(1, rect.width - 2 * radius)));
          const value = Math.max(min, Math.min(max, min + Math.round(ratio * (max - min) / step) * step));
          if (Number(input.value) !== value) {
            input.value = String(value);
            input.dispatchEvent(new Event("input", { bubbles: true }));
          }
        }
        function down(event) {
          const input = event.target.closest?.("input[type=range]");
          if (!input || input.disabled || event.button !== 0 || drag) return;
          event.preventDefault();
          drag = { id: event.pointerId, input, rect: input.getBoundingClientRect(), start: input.value };
          input.setPointerCapture(event.pointerId);
          move(event);
        }
        function end(event) {
          if (!drag || event.pointerId !== drag.id) return;
          move(event);
          const { input, start, id } = drag;
          drag = null;
          if (input.hasPointerCapture(id)) input.releasePointerCapture(id);
          if (input.value !== start) input.dispatchEvent(new Event("change", { bubbles: true }));
        }
        function lost(event) {
          if (drag?.id === event.pointerId) {
            const { input, start } = drag;
            drag = null;
            if (input.value !== start) input.dispatchEvent(new Event("change", { bubbles: true }));
          }
        }
        root.addEventListener("pointerdown", down);
        root.addEventListener("pointermove", move);
        root.addEventListener("pointerup", end);
        root.addEventListener("pointercancel", lost);
        root.addEventListener("lostpointercapture", lost);
        return { active: (input) => drag?.input === input, destroy() {
          drag = null;
          for (const [type, fn] of [["pointerdown", down], ["pointermove", move], ["pointerup", end], ["pointercancel", lost], ["lostpointercapture", lost]]) root.removeEventListener(type, fn);
        } };
      }
      module.exports = { attachSettingsRanges };
    }
  });

  // apps/three-game/product/panels.cjs
  var require_panels2 = __commonJS({
    "apps/three-game/product/panels.cjs"(exports, module) {
      "use strict";
      var { createVisualLayer } = require_visual_layer();
      var { attachSettingsScroll } = require_settings_scroll();
      var operationLayout = require_operation_layout_setting();
      var settingsTabs = require_settings_tabs();
      var esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
      function createPanels(api, { legacyEnabled = true } = {}) {
        const legacy = legacyEnabled ? require_panels().createPanels({ ...api, returnToLegacyLobby: false }) : { close() {
        }, isOpen: () => false }, visual = createVisualLayer("product-game-panel", { viewportModal: true });
        visual.host.style.zIndex = 170;
        let resolveConfirm = null, kind = "", settingsScroll = null;
        function close() {
          settingsScroll?.destroy();
          settingsScroll = null;
          visual.screen.querySelector("dialog[open]")?.close();
          visual.host.hidden = true;
          kind = "";
          if (resolveConfirm) {
            resolveConfirm(false);
            resolveConfirm = null;
          }
          legacy.close();
        }
        function shell(id, title, body, actions = "", simple = false) {
          settingsScroll?.destroy();
          settingsScroll = null;
          legacy.close();
          visual.screen.querySelector("dialog[open]")?.close();
          visual.host.hidden = false;
          visual.screen.innerHTML = `<div id="overlay" data-drawer="${id}"><dialog class="dialog ${simple ? "simple-dialog" : "corner-dismissible"}" role="dialog" aria-modal="true" aria-labelledby="productPanelTitle"><header class="dialog-head"><h2 id="productPanelTitle">${esc(title)}</h2></header><div class="dialog-body">${body}</div>${actions ? `<footer class="dialog-footer"><div class="actions">${actions}</div></footer>` : ""}${!simple ? '<button class="game-dialog-close" data-close aria-label="\u5173\u95ED"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7l10 10M17 7L7 17" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg></button>' : ""}</dialog></div>`;
          visual.resize();
          kind = id;
          const dialog = visual.screen.querySelector(".dialog");
          dialog.tabIndex = -1;
          for (const input of dialog.querySelectorAll('input[type="range"]')) rangeFill(input);
          dialog.showModal();
          visual.resize();
          settingsScroll = attachSettingsScroll(dialog);
          dialog.focus({ preventScroll: true });
        }
        const rangeGestures = require_settings_range().attachSettingsRanges(visual.screen);
        const rangeFill = (input) => input.style.setProperty("--setting-range-fill", (Number(input.value) - Number(input.min)) / (Number(input.max) - Number(input.min)) * 100 + "%");
        const volume = (p) => p.soundEnabled === false ? 0 : Math.round((Number.isFinite(p.gameVolume) ? p.gameVolume : 0.7) * 100);
        function snapVolume(input) {
          const value = Number(input.value);
          input.value = String(value > 100 ? Math.round(value / 25) * 25 : value);
        }
        function volumeKey(event) {
          const input = event.target;
          if (!input.matches?.("[data-game-volume]") || input.disabled || !["ArrowRight", "ArrowUp", "ArrowLeft", "ArrowDown"].includes(event.key)) return;
          event.preventDefault();
          event.stopPropagation();
          const value = Number(input.value), up = ["ArrowRight", "ArrowUp"].includes(event.key);
          input.value = String(Math.max(0, Math.min(300, up ? value >= 100 ? (Math.floor(value / 25) + 1) * 25 : value + 1 : value > 100 ? (Math.ceil(value / 25) - 1) * 25 : value - 1)));
          input.dispatchEvent(new Event("input", { bubbles: true }));
          input.dispatchEvent(new Event("change", { bubbles: true }));
        }
        visual.screen.addEventListener("keydown", volumeKey);
        visual.screen.addEventListener("keydown", settingsTabs.handleKey);
        function settings() {
          const device = window.SnookerPracticeSettings || require_device_preferences();
          const { cueBallRedDotsEnabled, clickAimEnabled, peekFreeMaxZoom } = device.read();
          const p = { ...api.preferences(), cueBallRedDotsEnabled, clickAimEnabled, peekFreeMaxZoom };
          const interactions = [["acceptOnlineInvites", "\u63A5\u53D7\u9080\u8BF7"], ["allowSpectators", "\u5141\u8BB8\u89C2\u6218"], ["quickChatEnabled", "\u804A\u5929\u6D88\u606F"], ["spectatorMessagesEnabled", "\u89C2\u6218\u6D88\u606F"]];
          const groups = {
            operation: [operationLayout.row(), `<label class="row settings-slider-row"><span>\u4E0B\u62C9\u653E\u5927</span><span class="settings-slider-control"><output data-peek-output>${Number(p.peekFreeMaxZoom ?? 1).toFixed(1)} \u500D</output><input type="range" min="1" max="2" step="0.1" aria-label="\u4E0B\u62C9\u653E\u5927" data-peek-zoom value="${p.peekFreeMaxZoom ?? 1}"></span></label>`, `<label class="row"><span>\u70B9\u51FB\u7784\u51C6</span><input class="switch" type="checkbox" role="switch" aria-label="\u70B9\u51FB\u7784\u51C6" data-device-setting="clickAimEnabled" ${p.clickAimEnabled !== false ? "checked" : ""}></label>`],
            display: [`<div class="row"><span id="qualityLabel">\u753B\u8D28</span><div class="settings-segment" role="group" aria-labelledby="qualityLabel">${[["smooth", "\u6D41\u7545"], ["high", "\u9AD8\u6E05"], ["ultra", "\u8D85\u6E05"]].map(([v, t]) => `<button data-quality="${v}" aria-pressed="${(p.graphicsQuality || "ultra") === v}" class="${(p.graphicsQuality || "ultra") === v ? "active" : ""}">${t}</button>`).join("")}</div></div>`, `<div class="row"><span id="frameRateLabel">\u5E27\u7387</span><div class="settings-segment" role="group" aria-labelledby="frameRateLabel">${[60, 90, 120, 0].map((v) => `<button data-max-frame-rate="${v}" aria-pressed="${(p.maxFrameRate === 30 ? 60 : p.maxFrameRate || 0) === v}" class="${(p.maxFrameRate === 30 ? 60 : p.maxFrameRate || 0) === v ? "active" : ""}">${v || "\u4E0D\u9650"}</button>`).join("")}</div></div>`, `<label class="row"><span>\u6BCD\u7403\u7EA2\u70B9</span><input class="switch" type="checkbox" role="switch" aria-label="\u6BCD\u7403\u7EA2\u70B9" data-device-setting="cueBallRedDotsEnabled" ${p.cueBallRedDotsEnabled !== false ? "checked" : ""}></label>`],
            sound: [`<label class="row settings-slider-row"><span>\u6E38\u620F\u97F3\u91CF</span><span class="settings-slider-control"><output data-volume-output>${volume(p)}%</output><input type="range" min="0" max="300" step="1" aria-label="\u6E38\u620F\u97F3\u91CF" data-game-volume value="${volume(p)}"></span></label>`, `<label class="row"><span>\u540E\u53F0\u58F0\u97F3\u64AD\u653E</span><input class="switch" type="checkbox" role="switch" aria-label="\u540E\u53F0\u58F0\u97F3\u64AD\u653E" data-setting="backgroundAudioEnabled" ${p.backgroundAudioEnabled !== false ? "checked" : ""}></label>`, `<div class="row"><span id="voiceLanguageLabel">\u62A5\u5206\u8BED\u8A00</span><div class="settings-segment" role="group" aria-labelledby="voiceLanguageLabel">${[["zh", "\u4E2D\u6587"], ["en", "\u82F1\u6587"], ["off", "\u5173\u95ED"]].map(([v, t]) => `<button data-voice="${v}" aria-pressed="${(["zh", "en", "off"].includes(p.scoreVoiceMode) ? p.scoreVoiceMode : "en") === v}" class="${(["zh", "en", "off"].includes(p.scoreVoiceMode) ? p.scoreVoiceMode : "en") === v ? "active" : ""}">${t}</button>`).join("")}</div></div>`],
            interaction: api.onlineSettings === false ? [] : interactions.map(([key, title]) => `<label class="row"><span>${title}</span><input class="switch" type="checkbox" role="switch" aria-label="${title}" data-setting="${key}" ${key === "spectatorMessagesEnabled" && p.allowSpectators === false ? "disabled" : ""} ${p[key] !== false ? "checked" : ""}></label>`)
          };
          shell("settings", "\u6E38\u620F\u8BBE\u7F6E", settingsTabs.render(groups, { id: "room-settings" }));
        }
        function confirm(text, { id = "concede", cancel = "\u53D6\u6D88", confirm: confirm2 = "\u786E\u8BA4" } = {}) {
          close();
          shell(id, text, "", `<button class="standard-action" data-answer="no">${esc(cancel)}</button><button class="danger standard-action" data-answer="yes">${esc(confirm2)}</button>`, true);
          return new Promise((resolve) => resolveConfirm = resolve);
        }
        visual.screen.addEventListener("click", async (e) => {
          const b = e.target.closest("button");
          if (!b) return;
          if (b.hasAttribute("data-close")) return close();
          if (b.dataset.answer) {
            const resolve = resolveConfirm;
            resolveConfirm = null;
            close();
            resolve?.(b.dataset.answer === "yes");
            return;
          }
          if (b.dataset.settingsTab) {
            settingsTabs.activate(b);
            visual.screen.querySelector(".dialog-body").scrollTop = 0;
            settingsScroll.update();
            return;
          }
          if (b.dataset.operationLayout) return operationLayout.select(b, api.notice);
          if (b.dataset.voice || b.dataset.quality || b.hasAttribute("data-max-frame-rate")) {
            if (b.getAttribute("aria-pressed") === "true") return;
            b.disabled = true;
            try {
              await api.setPreference(b.hasAttribute("data-max-frame-rate") ? "maxFrameRate" : b.dataset.quality ? "graphicsQuality" : "scoreVoiceMode", b.hasAttribute("data-max-frame-rate") ? Number(b.dataset.maxFrameRate) : b.dataset.quality || b.dataset.voice);
            } catch (e2) {
              api.notice?.(e2.message || "\u8BBE\u7F6E\u4FDD\u5B58\u5931\u8D25");
            } finally {
              b.disabled = false;
              if (kind === "settings" && b.isConnected) {
                const p = api.preferences(), key = b.hasAttribute("data-max-frame-rate") ? "maxFrameRate" : b.dataset.quality ? "graphicsQuality" : "scoreVoiceMode", value = key === "maxFrameRate" ? p[key] || 0 : key === "graphicsQuality" ? p[key] || "ultra" : ["zh", "en", "off"].includes(p[key]) ? p[key] : "en";
                for (const item of b.parentElement.querySelectorAll("button")) {
                  const own = key === "maxFrameRate" ? Number(item.dataset.maxFrameRate) : item.dataset.quality || item.dataset.voice;
                  item.setAttribute("aria-pressed", String(own === value));
                  item.classList.toggle("active", own === value);
                }
              }
            }
          }
        });
        visual.screen.addEventListener("input", (e) => {
          const input = e.target;
          if (input.hasAttribute("data-game-volume")) snapVolume(input);
          if (input.type === "range") rangeFill(input);
          if (input.hasAttribute("data-peek-zoom")) {
            input.parentElement.querySelector("[data-peek-output]").textContent = Number(input.value).toFixed(1) + " \u500D";
            const result = (window.SnookerPracticeSettings || require_device_preferences()).set("peekFreeMaxZoom", Number(input.value));
            if (!result.persisted) api.notice?.("\u5F53\u524D\u6D4F\u89C8\u5668\u672A\u80FD\u4FDD\u5B58\u8BBE\u7F6E");
          }
          if (input.hasAttribute("data-game-volume")) input.parentElement.querySelector("[data-volume-output]").textContent = input.value + "%";
        });
        const volumeSaves = /* @__PURE__ */ new WeakMap();
        async function saveVolume(input) {
          let job = volumeSaves.get(input);
          if (!job) {
            job = { next: null, running: false };
            volumeSaves.set(input, job);
          }
          job.next = Number(input.value) / 100;
          if (job.running) return;
          job.running = true;
          try {
            while (job.next !== null) {
              const value = job.next;
              job.next = null;
              try {
                await api.setPreference("gameVolume", value);
              } catch (e) {
                api.notice?.(e.message || "\u8BBE\u7F6E\u4FDD\u5B58\u5931\u8D25");
                if (job.next === null && Number(input.value) / 100 === value && !rangeGestures.active(input)) {
                  input.value = volume(api.preferences());
                  rangeFill(input);
                  input.parentElement.querySelector("[data-volume-output]").textContent = input.value + "%";
                }
              }
            }
          } finally {
            job.running = false;
          }
        }
        visual.screen.addEventListener("change", async (e) => {
          const input = e.target;
          const deviceKey = input.dataset.deviceSetting;
          if (deviceKey) {
            const result = (window.SnookerPracticeSettings || require_device_preferences()).set(deviceKey, input.checked);
            if (!result.persisted) api.notice?.("\u5F53\u524D\u6D4F\u89C8\u5668\u672A\u80FD\u4FDD\u5B58\u8BBE\u7F6E");
            return;
          }
          const isVolume = input.hasAttribute("data-game-volume");
          if (!input.dataset.setting && !isVolume) return;
          if (isVolume) {
            snapVolume(input);
            saveVolume(input);
            return;
          }
          input.disabled = true;
          try {
            await api.setPreference(isVolume ? "gameVolume" : input.dataset.setting, isVolume ? Number(input.value) / 100 : input.checked);
          } catch (e2) {
            api.notice?.(e2.message || "\u8BBE\u7F6E\u4FDD\u5B58\u5931\u8D25");
          } finally {
            input.disabled = false;
            if (input.isConnected) {
              const p = api.preferences();
              if (isVolume) {
                input.value = volume(p);
                rangeFill(input);
                input.parentElement.querySelector("[data-volume-output]").textContent = volume(p) + "%";
              } else input.checked = p[input.dataset.setting] !== false;
              const spectatorSwitch = visual.screen.querySelector('[data-setting="spectatorMessagesEnabled"]');
              if (spectatorSwitch) {
                spectatorSwitch.checked = p.allowSpectators !== false && p.spectatorMessagesEnabled !== false;
                spectatorSwitch.disabled = p.allowSpectators === false;
              }
            }
          }
        });
        const keyboard = (e) => {
          if (!visual.host.hidden && e.key === "Escape") {
            e.preventDefault();
            e.stopPropagation();
            close();
          }
        };
        document.addEventListener("keydown", keyboard, true);
        addEventListener("pagehide", () => {
          document.removeEventListener("keydown", keyboard, true);
          settingsScroll?.destroy();
          rangeGestures.destroy();
          visual.destroy();
        }, { once: true });
        return { ...legacy, settings, confirm, close, isOpen: () => !visual.host.hidden || legacy.isOpen() };
      }
      module.exports = { createPanels };
    }
  });

  // apps/three-game/trial/settings.cjs
  var require_settings = __commonJS({
    "apps/three-game/trial/settings.cjs"(exports, module) {
      function createPracticeSettings({ core, notice, requestFrame }) {
        const preferences = window.SnookerPracticeSettings;
        const panels = require_panels2().createPanels({ onlineSettings: false, preferences: preferences.read, notice, setPreference(key, value) {
          const result = preferences.set(key, value);
          if (!result.persisted) notice("\u5F53\u524D\u6D4F\u89C8\u5668\u672A\u80FD\u4FDD\u5B58\u8BBE\u7F6E");
        } }, { legacyEnabled: false });
        const button = document.createElement("button");
        button.id = "trial-settings";
        button.type = "button";
        button.setAttribute("aria-label", "\u6E38\u620F\u8BBE\u7F6E");
        button.title = "\u6E38\u620F\u8BBE\u7F6E";
        button.innerHTML = '<svg style="width:58%;height:58%;pointer-events:none" viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 2.5h19M2.5 12h19M2.5 21.5h19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
        button.style.cssText = "position:fixed;z-index:9;display:grid;place-items:center;background:#0005;border:1.5px solid #ffffff38;border-radius:6px;color:#fff;box-sizing:border-box;padding:0;cursor:pointer";
        button.onclick = () => panels.settings();
        for (const name of ["pointerdown", "pointermove", "pointerup", "touchstart", "touchend"]) button.addEventListener(name, (event) => event.stopPropagation());
        document.querySelector("#viewer").append(button);
        window.addEventListener("pagehide", () => button.remove(), { once: true });
        let previous = "";
        return { position({ left, top, size, replay }) {
          const value = [left, top, size, replay].join(",");
          if (value === previous) return;
          previous = value;
          Object.assign(button.style, { left: left + "px", top: top + "px", width: size + "px", height: size + "px" });
          button.style.display = replay ? "none" : "grid";
        }, close: panels.close };
      }
      module.exports = { createPracticeSettings };
    }
  });

  // apps/three-game/trial/ui.cjs
  var require_ui = __commonJS({
    "apps/three-game/trial/ui.cjs"() {
      var { drawReplayFooter } = require_replay_footer();
      var { createPracticeReplayUI } = require_practice_replay_ui();
      var trialTuning = require_tuning();
      var { powerGeometry, alignPowerToFullscreen } = require_power_geometry();
      var { anchorShotControls } = require_side_anchors();
      var { tipPadMetrics } = require_shotControlRenderer();
      var { drawPracticeHud, drawPracticeViews, DIFFICULTIES } = require_practice_hud();
      var { roundRect } = require_canvasPrimitives();
      var { drawTipMagnifier, tipMagnifierRect, tipMagnifierCenterLeftOfSource } = require_shotControlsHudRenderer();
      var { drawRuleToast } = require_notifications();
      var { createRuleResultMessages } = require_intermission();
      var Practice = require_practiceMode();
      var { createRuleToastQueue } = require_ruleToastQueue();
      var { createLayoutRuntime } = require_layout_runtime();
      var { mapFooterRect, anchorFooterBottom, distributeFooterRows, keys: footerKeys } = require_footer_layout();
      var practiceDefaults = {
        practiceBreakScoreboard: { x: 280, y: 976, width: 480, height: 68, opacity: 1 },
        practiceDifficultySelector: { x: 784, y: 976, width: 134, height: 68, opacity: 1 },
        practiceShapeSelector: { x: 934, y: 976, width: 240, height: 68, opacity: 1 },
        practiceFreePlacementToggle: { x: 1198, y: 976, width: 210, height: 68, opacity: 1 },
        practiceViewButtons: { x: 1018, y: 976, width: 460, height: 68, opacity: 1 },
        practiceResetButton: { x: 1440, y: 976, width: 200, height: 68, opacity: 1 }
      };
      async function initialize({ core, setView, getView, getTipHeldAt = () => null, prepareAudio = async () => true, requestFrame = () => {
      }, celebration = null }) {
        const runtime = await (window.ThreeTrialPageLayoutReady || createLayoutRuntime());
        let localSettings = null;
        let layout, scale = 1, offsetX = 0, offsetY = 0, menuOpen = false, difficultyOpen = false, difficultyId = window.SnookerOnline?.difficulty() || trialTuning.readDifficulty(), message = "";
        const toastDuration = window.SnookerProduct ? 3e3 : 5e3, toastFadeAt = toastDuration - 520;
        const notices = createRuleToastQueue({ now: () => performance.now(), slotMs: toastDuration });
        const canvas = document.createElement("canvas");
        canvas.id = "trial-hud";
        canvas.setAttribute("aria-label", "\u5355\u6746\u5F97\u5206\u7EC3\u4E60");
        document.querySelector("#viewer").append(canvas);
        const controls = document.createElement("div");
        controls.id = "trial-practice-controls";
        controls.style.paddingBottom = "env(safe-area-inset-bottom, 0px)";
        document.querySelector("#viewer").append(controls);
        const pickerGlass = window.SnookerProduct ? document.createElement("div") : null;
        if (pickerGlass) {
          pickerGlass.className = "product-practice-picker-glass";
          pickerGlass.hidden = true;
          pickerGlass.setAttribute("aria-hidden", "true");
          document.querySelector("#viewer").append(pickerGlass);
        }
        controls.style.paddingLeft = window.SnookerProduct ? "var(--product-game-safe-horizontal, env(safe-area-inset-left, 0px))" : "env(safe-area-inset-left, 0px)";
        controls.style.paddingRight = window.SnookerProduct ? "var(--product-game-safe-horizontal, env(safe-area-inset-right, 0px))" : "env(safe-area-inset-right, 0px)";
        controls.style.paddingTop = "env(safe-area-inset-top, 0px)";
        const buttons = /* @__PURE__ */ new Map();
        const replayUI = window.SnookerOnline ? null : createPracticeReplayUI({ core, setView, getView, notice, prepareAudio });
        window.addEventListener("pagehide", (event) => {
          if (!event.persisted) replayUI?.dispose();
        });
        let replayFooterTop = null;
        let footerDrawing = false, footerTransform = { scale: 1, x: 0, y: 0 };
        let layoutDirty = true, layoutCache = null, layoutVersion = 0, lastDrawKey = "", lastBaseKey = "", lastOverlayRects = [], safeInsets = {};
        const invalidate = () => {
          replayFooterTop = null;
          layoutDirty = true;
          lastDrawKey = "";
          requestFrame();
        };
        window.addEventListener("resize", invalidate);
        window.addEventListener("product-viewport-resize", invalidate);
        window.addEventListener("operation-layout-change", invalidate);
        window.visualViewport?.addEventListener("resize", invalidate);
        document.fonts?.ready.then(invalidate);
        window.addEventListener("pagehide", (event) => {
          if (event.persisted) return;
          window.removeEventListener("resize", invalidate);
          window.removeEventListener("product-viewport-resize", invalidate);
          window.removeEventListener("operation-layout-change", invalidate);
          window.visualViewport?.removeEventListener("resize", invalidate);
        });
        function writeStyle(el, values) {
          for (const [key, value] of Object.entries(values)) if (el.style[key] !== value) el.style[key] = value;
        }
        function attribute(el, key, value) {
          value = String(value);
          if (el.getAttribute(key) !== value) el.setAttribute(key, value);
        }
        let usedButtons = /* @__PURE__ */ new Set();
        function footerFit(layout2) {
          if (!window.SnookerProduct || runtime.sourceProfile().orientation === "portrait") return { scale: 1, x: 0, y: 0 };
          const items = footerKeys.map((key) => layout2[key]).filter((r) => r && !r.hidden);
          if (!items.length) return { scale: 1, x: 0, y: 0 };
          const design = runtime.profile(), s = Math.min(innerWidth / design.width, innerHeight / design.height), ox = (innerWidth - design.width * s) / 2;
          const left = Math.min(...items.map((r) => r.x)), right = Math.max(...items.map((r) => r.x + r.width)), bottom = Math.max(...items.map((r) => r.y + r.height));
          const fit = Math.min(1, Math.max(1, innerWidth - safeInsets.left - safeInsets.right - 24) / ((right - left) * s));
          return { scale: fit, x: (innerWidth / 2 - ox) / s - (left + right) / 2 * fit, y: bottom * (1 - fit) };
        }
        function notice(text) {
          if (window.SnookerProduct && window.ProductNotifications) {
            window.ProductNotifications.notice(text);
            return;
          }
          message = text;
          if (window.SnookerProduct && /^(已切换：|自由摆球已)/.test(text)) notices.clear();
          requestFrame(false);
          return notices.push(text);
        }
        function page(fit = true) {
          const raw = runtime.page();
          if (!layoutDirty && layoutCache?.raw === raw && layoutCache.width === innerWidth && layoutCache.height === innerHeight) return fit ? layoutCache.fitted : layoutCache.rawLayout;
          if (window.SnookerProduct) window.ProductViewport?.measure();
          const style = getComputedStyle(controls);
          safeInsets = { bottom: parseFloat(style.paddingBottom) || 0, top: parseFloat(style.paddingTop) || 0, left: parseFloat(style.paddingLeft) || 0, right: parseFloat(style.paddingRight) || 0 };
          const result = { ...raw, ...Object.fromEntries(Object.entries(practiceDefaults).map(([k, v]) => [k, raw[k] || { ...v, hidden: true }])) };
          const design = runtime.profile(), s = Math.min(innerWidth / design.width, innerHeight / design.height), oy = (innerHeight - design.height * s) / 2;
          const safe = safeInsets.bottom;
          const safeTop = safeInsets.top;
          const anchored = Object.fromEntries(Object.entries(result).map(([key, r]) => [key, r.anchor === "bottom" ? { ...r, y: (innerHeight - oy - safe) / s - r.height - (r.bottomInset ?? 16) } : r.anchor === "top" ? { ...r, y: (safeTop - oy) / s + (r.topInset ?? 12) } : r]));
          const footerAnchored = anchorFooterBottom(anchored, { height: innerHeight, scale: s, offsetY: oy, safeBottom: safe });
          const footerRows = runtime.sourceProfile().orientation === "portrait" ? distributeFooterRows(footerAnchored, { width: innerWidth, scale: s, offsetX: (innerWidth - design.width * s) / 2, safeLeft: safeInsets.left, safeRight: safeInsets.right }) : footerAnchored;
          const anchoredSides = anchorShotControls(footerRows, { device: runtime.device, width: innerWidth, height: innerHeight, safeLeft: safeInsets.left, safeRight: safeInsets.right, designWidth: design.width, designHeight: design.height, compactMobile: Boolean(window.SnookerProduct) });
          if (window.SnookerOnline && !window.SnookerOnline.isLocalPractice?.()) {
            const bounds = window.SnookerOnline.scoreboardBounds();
            const limit = (bounds.y - oy - 12) / s;
            const tip = anchoredSides.tipPad, power = anchoredSides.powerPull;
            const shift = Math.max(0, Math.max(tip ? tip.y + tip.height : 0, power ? powerGeometry(power, runtime.device === "mobile").rect.y + powerGeometry(power, runtime.device === "mobile").rect.height : 0) - limit);
            for (const key of ["tipPad", "powerPull"]) if (anchoredSides[key]) anchoredSides[key] = { ...anchoredSides[key], y: anchoredSides[key].y - shift };
            const bar = anchoredSides.effectivePowerBar;
            if (bar) anchoredSides.effectivePowerBar = { ...bar, y: Math.min(bar.y, limit - bar.height) };
          }
          if (anchoredSides.effectivePowerBar) anchoredSides.effectivePowerBar = { ...anchoredSides.effectivePowerBar, x: (design.width - anchoredSides.effectivePowerBar.width) / 2 };
          if (window.SnookerProduct && runtime.device === "mobile") {
            document.documentElement.style.setProperty("--product-ui-scale", String(Math.min(innerWidth / (innerHeight > innerWidth ? 540 : 960), innerHeight / (innerHeight > innerWidth ? 960 : 540))));
            const fullscreen = document.getElementById("trial-fullscreen");
            if (fullscreen) anchoredSides.powerPull = alignPowerToFullscreen(anchoredSides.powerPull, fullscreen.getBoundingClientRect(), { scale: s, offsetX: (innerWidth - design.width * s) / 2 });
          }
          const t = footerFit(anchoredSides), fitted = Object.fromEntries(Object.entries(anchoredSides).map(([k, r]) => [k, footerKeys.includes(k) ? mapFooterRect(r, t) : r]));
          layoutCache = { raw, width: innerWidth, height: innerHeight, rawLayout: anchoredSides, fitted };
          layoutDirty = false;
          layoutVersion++;
          return fit ? fitted : anchoredSides;
        }
        function place(el, r) {
          writeStyle(el, { left: `${offsetX + r.x * scale}px`, top: `${offsetY + r.y * scale}px`, width: `${r.width * scale}px`, height: `${r.height * scale}px`, opacity: String(r.opacity ?? 1), visibility: r.hidden ? "hidden" : "visible" });
        }
        const showPickerGlass = pickerGlass ? (rect) => {
          place(pickerGlass, mapFooterRect(rect, footerTransform));
          writeStyle(pickerGlass, { borderRadius: `${12 * footerTransform.scale * scale}px` });
          pickerGlass.hidden = false;
        } : void 0;
        function control(id, label, r, action, disabled = false) {
          let b = buttons.get(id);
          if (!b) {
            b = document.createElement("button");
            b.dataset.action = id;
            b.onclick = () => {
              action();
              requestFrame();
            };
            controls.append(b);
            buttons.set(id, b);
          }
          usedButtons.add(id);
          attribute(b, "data-popup", Boolean(r.popup));
          attribute(b, "aria-label", label);
          if (b.title !== label) b.title = label;
          if (b.disabled !== disabled) b.disabled = disabled;
          if (b.hidden) b.hidden = false;
          place(b, footerDrawing ? mapFooterRect(r, footerTransform) : r);
          return b;
        }
        let frameState = { ui: false, wakeAt: Infinity };
        function update(now) {
          replayUI?.update();
          layout = page(false);
          footerTransform = footerFit(layout);
          const design = runtime.profile();
          scale = Math.min(innerWidth / design.width, innerHeight / design.height);
          offsetX = (innerWidth - design.width * scale) / 2;
          offsetY = (innerHeight - design.height * scale) / 2;
          const footerHeight = (Math.max(...footerKeys.map((key) => layout[key]).filter((r) => r && !r.hidden).map((r) => r.height), 0) || 68) * footerTransform.scale * scale;
          const fullscreen = document.getElementById("trial-fullscreen");
          if (fullscreen && fullscreen.style.height !== `${footerHeight}px`) {
            fullscreen.style.height = `${footerHeight}px`;
            fullscreen.style.width = `${footerHeight}px`;
            document.documentElement.style.setProperty("--trial-fullscreen-size", `${footerHeight}px`);
          }
          if (fullscreen) {
            const style = layout.practiceViewButtons;
            const alpha = String(style?.backgroundOpacity ?? 0.42);
            if (fullscreen.style.getPropertyValue("--fullscreen-background-alpha") !== alpha) fullscreen.style.setProperty("--fullscreen-background-alpha", alpha);
            writeStyle(fullscreen, { opacity: String(style?.opacity ?? 1) });
          }
          const currentToast = notices.next(now);
          const state = core.getState(), heldAt = getTipHeldAt(), tipValue = core.getTip(), observing = Boolean(window.SnookerOnline?.isObserver?.() && !window.SnookerOnline?.isLocalPractice?.());
          const magnifier = !observing && window.SnookerOnline?.preferences().tipMagnifierEnabled !== false && heldAt !== null && now - heldAt >= 200 && core.canAdjustTip() && !layout.tipPad?.hidden;
          const toastAge = currentToast ? now - currentToast.startedAt : 0;
          const animatingToast = !!currentToast && (toastAge < 280 || !notices.hasQueued() && toastAge > toastFadeAt);
          frameState = { ui: animatingToast, wakeAt: Math.min(
            currentToast ? currentToast.startedAt + (toastAge < toastFadeAt && !notices.hasQueued() ? toastFadeAt : toastDuration) : Infinity,
            heldAt !== null && now < heldAt + 200 ? heldAt + 200 : Infinity
          ) };
          const baseKey = JSON.stringify([
            layoutVersion,
            innerWidth,
            innerHeight,
            Math.min(devicePixelRatio || 1, 2),
            menuOpen,
            difficultyOpen,
            difficultyId,
            observing,
            core.isPractice(),
            state.practiceStreak,
            state.players[0].break,
            state.ruleState?.currentBreakPots,
            core.getPracticeShape(),
            core.isFreePlacement(),
            core.canRetry(),
            core.isBusy(),
            core.canOperate(),
            getView(),
            core.replayStatus()
          ]);
          const drawKey = JSON.stringify([baseKey, magnifier, magnifier ? tipValue.x : null, magnifier ? tipValue.y : null, currentToast?.id, currentToast?.text]);
          if (drawKey === lastDrawKey && !animatingToast) return;
          lastDrawKey = drawKey;
          const power = layout.powerPull || { x: 0, y: 42, width: 110, height: 356, hidden: true }, tip = layout.tipPad || { x: 0, y: 0, width: 175, height: 175, hidden: true };
          place(document.querySelector("#power-track"), { ...powerGeometry(power, runtime.device === "mobile").rect, hidden: power.hidden || observing });
          place(document.querySelector("#tip-pad"), { ...tip, hidden: tip.hidden || observing });
          if (window.SnookerProduct) {
            const viewer = document.querySelector("#viewer"), radius = tipPadMetrics(tip).radius, outer = radius + Math.max(2, radius * 0.08) / 2, diameter = 2 * outer * scale, visibleTop = offsetY + (tip.y + tip.height / 2 - outer) * scale;
            viewer.toggleAttribute("data-product-side-controls", runtime.device === "mobile" && !core.isReplay());
            const joystickSize = tip.joystickSizePx ?? diameter;
            for (const [key, value] of Object.entries({ "--product-joystick-left": safeInsets.left + "px", "--product-joystick-top": visibleTop - joystickSize - (tip.joystickGapPx ?? 16) + "px", "--product-joystick-size": joystickSize + "px" })) if (viewer.style.getPropertyValue(key) !== value) viewer.style.setProperty(key, value);
          }
          const dpr = Math.min(devicePixelRatio || 1, 2), w = Math.round(innerWidth * dpr), h = Math.round(innerHeight * dpr);
          if (canvas.width !== w || canvas.height !== h) {
            canvas.width = w;
            canvas.height = h;
          }
          let magnifierCenter = null;
          const overlayRects = [];
          if (magnifier) {
            magnifierCenter = tipMagnifierCenterLeftOfSource(tip, 2, 100);
            if (runtime.device === "mobile") magnifierCenter.x = 2 * (tip.x + tip.width / 2) - magnifierCenter.x;
            const radius = Math.min(tip.width, tip.height);
            magnifierCenter.y = Math.max(-offsetY / scale + radius + 12, Math.min((innerHeight - offsetY) / scale - radius - 12, magnifierCenter.y));
            overlayRects.push(tipMagnifierRect(tip, null, null, 2, magnifierCenter));
          }
          if ((currentToast || runtime.preview) && layout.toast && !layout.toast.hidden) {
            const r = layout.toast;
            overlayRects.push({ ...r, y: r.y - 20, height: r.height + 20 });
          }
          const fullPaint = baseKey !== lastBaseKey;
          if (fullPaint && pickerGlass) pickerGlass.hidden = true;
          const dirtyRects = lastOverlayRects.concat(overlayRects);
          const shouldPaintFooter = (source) => {
            if (fullPaint || menuOpen || difficultyOpen) return true;
            if (!source || source.hidden) return false;
            const r = mapFooterRect(source, footerTransform), pad = Math.max(8, (source.fontSize || 26.4) * 2 * footerTransform.scale);
            return dirtyRects.some((d) => d.x - 8 < r.x + r.width + pad && d.x + d.width + 8 > r.x - pad && d.y - 8 < r.y + r.height + pad && d.y + d.height + 8 > r.y - pad);
          };
          const paintPracticeFooter = footerKeys.some((key) => shouldPaintFooter(layout[key]));
          lastBaseKey = baseKey;
          const ctx = canvas.getContext("2d");
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          ctx.save();
          if (!fullPaint) {
            ctx.beginPath();
            for (const r of [...lastOverlayRects, ...overlayRects]) ctx.rect(offsetX + (r.x - 8) * scale, offsetY + (r.y - 8) * scale, (r.width + 16) * scale, (r.height + 16) * scale);
            ctx.clip();
          }
          const previousOverlayRects = lastOverlayRects;
          lastOverlayRects = overlayRects;
          if (fullPaint) ctx.clearRect(0, 0, innerWidth, innerHeight);
          else for (const r of overlayRects.concat(previousOverlayRects)) ctx.clearRect(offsetX + (r.x - 8) * scale, offsetY + (r.y - 8) * scale, (r.width + 16) * scale, (r.height + 16) * scale);
          ctx.translate(offsetX, offsetY);
          ctx.scale(scale, scale);
          ctx.save();
          ctx.translate(footerTransform.x, footerTransform.y);
          ctx.scale(footerTransform.scale, footerTransform.scale);
          footerDrawing = true;
          if (paintPracticeFooter && (!window.SnookerOnline || window.SnookerOnline.isLocalPractice?.()) && !replayUI?.watching) {
            const ui = drawPracticeHud(ctx, { core, layout, menuOpen, difficultyOpen, difficultyId, preview: runtime.preview, shouldPaint: shouldPaintFooter, showPickerGlass });
            if (fullPaint) {
              usedButtons.clear();
              control("practice-shape-selector", "\u7403\u578B\u9009\u62E9\uFF1A" + Practice.practiceShapeLabel(core.getPracticeShape()), ui.practiceShapeSelector, () => {
                menuOpen = !menuOpen;
                difficultyOpen = false;
              });
              const difficultyButton = control("practice-difficulty-selector", "\u96BE\u5EA6\u9009\u62E9\uFF1A" + DIFFICULTIES.find((d) => d.id === difficultyId).label, ui.practiceDifficultySelector, () => {
                if (core.canChangePracticeDifficulty?.() === false) {
                  difficultyOpen = false;
                  notice("\u4EC5\u5F00\u5C40\u65F6\u53EF\u5207\u6362\u96BE\u5EA6");
                  return;
                }
                difficultyOpen = !difficultyOpen;
                menuOpen = false;
              });
              attribute(difficultyButton, "aria-expanded", difficultyOpen);
              attribute(difficultyButton, "aria-haspopup", "listbox");
              attribute(buttons.get("practice-shape-selector"), "aria-expanded", menuOpen);
              attribute(buttons.get("practice-shape-selector"), "aria-haspopup", "listbox");
              for (const r of ui.practiceDifficultyOptions) control(r.id, DIFFICULTIES.find((d) => d.id === r.value).label, { ...r, hidden: layout.practiceDifficultySelector.hidden }, () => {
                if (core.canChangePracticeDifficulty?.() === false) {
                  difficultyOpen = false;
                  notice("\u4EC5\u5F00\u5C40\u65F6\u53EF\u5207\u6362\u96BE\u5EA6");
                  return;
                }
                if ((!window.SnookerOnline || window.SnookerOnline.isLocalPractice?.()) && core.updateTuning({ aim: trialTuning.aimValues(r.value) })) {
                  difficultyId = r.value;
                  trialTuning.rememberDifficulty(difficultyId);
                  difficultyOpen = false;
                }
              });
              const toggle = control("practice-free-placement-toggle", "\u81EA\u7531\u6446\u7403", ui.practiceFreePlacementToggle, () => {
                if ((!window.SnookerOnline || window.SnookerOnline.isLocalPractice?.()) && core.setFreePlacement(!core.isFreePlacement())) {
                  menuOpen = false;
                  notice(core.isFreePlacement() ? "\u81EA\u7531\u6446\u7403\u5DF2\u5F00\u542F\uFF0C\u6309\u4F4F\u7403\u5373\u53EF\u62D6\u52A8" : "\u81EA\u7531\u6446\u7403\u5DF2\u5173\u95ED");
                }
              });
              toggle.setAttribute("aria-pressed", String(core.isFreePlacement()));
              toggle.setAttribute("aria-disabled", "false");
              control("practice-reset", "\u590D\u4F4D\u91CD\u6253", ui.practiceResetButton, () => {
                if (window.SnookerOnline && !window.SnookerOnline.isLocalPractice?.()) return;
                if (core.canRetry()) core.retry();
                else {
                  if (core.loadPracticeShape(core.getPracticeShape())) window.SnookerPracticeAnalytics?.track("challenge_started", { shapeId: core.getPracticeShape(), shapeName: Practice.practiceShapeLabel(core.getPracticeShape()) });
                }
                menuOpen = false;
                difficultyOpen = false;
                window.SnookerOnline?.practiceChanged?.();
              });
              const group = layout.practiceViewButtons;
              for (const r of drawPracticeViews(ctx, group, getView())) {
                const button = control(r.id, r.label, r, () => {
                  menuOpen = false;
                  setView(r.mode);
                });
                button.setAttribute("aria-pressed", String(getView() === r.mode));
              }
              for (const r of ui.practiceShapeOptions) control(r.id, Practice.practiceShapeLabel(r.shapeId), { ...r, hidden: layout.practiceShapeSelector.hidden }, () => {
                if (window.SnookerOnline && !window.SnookerOnline.isLocalPractice?.()) return;
                if (core.loadPracticeShape(r.shapeId)) {
                  window.SnookerPracticeAnalytics?.track("challenge_started", { shapeId: r.shapeId, shapeName: Practice.practiceShapeLabel(r.shapeId) });
                  menuOpen = false;
                  window.SnookerOnline?.practiceChanged?.();
                  notice("\u5DF2\u5207\u6362\uFF1A" + Practice.practiceShapeLabel(r.shapeId));
                }
              });
              for (const [id, b] of buttons) if (!usedButtons.has(id) && !b.hidden) b.hidden = true;
            } else drawPracticeViews(ctx, layout.practiceViewButtons, getView(), shouldPaintFooter);
          }
          if (window.SnookerOnline && !window.SnookerOnline.isLocalPractice?.()) for (const b of buttons.values()) b.hidden = true;
          if (replayUI?.watching) {
            usedButtons.clear();
            const r = drawReplayFooter(ctx, { core, layout, selected: getView(), portrait: runtime.device === "mobile" && innerHeight > innerWidth, left: Math.min(layout.practiceBreakScoreboard.x, layout.practiceViewButtons.x), right: (innerWidth - offsetX - safeInsets.right - 12) / scale, bottom: (innerHeight - offsetY - safeInsets.bottom - 12) / scale });
            replayFooterTop = { top: offsetY + r.top * scale, width: innerWidth, height: innerHeight };
            for (const view of r.views) {
              const el = control(view.id, view.label, view, () => setView(view.mode));
              attribute(el, "aria-pressed", getView() === view.mode);
            }
            for (const action of r.actions) control(action.id, action.label, action, () => replayUI.action(action.action), action.disabled);
            for (const [id, rect] of [["replay-score", r.score], ["replay-difficulty", r.difficulty], ["replay-shape", r.shape]]) {
              let el = buttons.get(id);
              if (!el) {
                el = document.createElement("span");
                el.className = "replay-label";
                el.dataset.action = id;
                controls.append(el);
                buttons.set(id, el);
              }
              usedButtons.add(id);
              el.hidden = false;
              el.textContent = rect.label || (core.getState().practiceStreak ? `\u8FDE\u8FDB ${core.getState().practiceStreak.current}` : `\u5355\u6746 ${core.getState().players[0].break}`);
              place(el, rect);
            }
            for (const [id, b] of buttons) if (!usedButtons.has(id)) b.hidden = true;
          }
          if (localSettings) {
            const { radius } = tipPadMetrics(tip), ringHalfWidth = Math.max(2, radius * 0.08) / 2;
            const left = runtime.device === "mobile" ? offsetX + (tip.x + tip.width / 2 - radius - ringHalfWidth) * scale : Math.max(12, safeInsets.left);
            localSettings.position({ left, top: Math.max(12, safeInsets.top), size: footerHeight, replay: core.isReplay() });
          }
          footerDrawing = false;
          ctx.restore();
          if (magnifierCenter) drawTipMagnifier(ctx, tip, tipValue, { scale: 2, dotScale: 2, center: magnifierCenter });
          const toast = currentToast || (runtime.preview ? { text: "\u793A\u4F8B\uFF1A\u72AF\u89C4\uFF0C\u7F5A 4 \u5206", startedAt: now, fixed: true } : null);
          if (toast && layout.toast && !layout.toast.hidden) {
            const age = now - toast.startedAt, ease = (p) => 1 - Math.pow(1 - p, 3);
            let opacity = 1, yOffset = 0;
            if (!toast.fixed && age < 280) {
              opacity = ease(age / 280);
              yOffset = -(1 - opacity) * 20;
            } else if (!toast.fixed && !notices.hasQueued() && age > toastFadeAt) {
              const p = ease((age - toastFadeAt) / 520);
              opacity = 1 - p;
              yOffset = -p * 18;
            }
            const toastRect = layout.toast;
            drawRuleToast(ctx, { sizeScale: runtime.device === "mobile" ? 2 : 1, rect: toastRect, text: toast.text, maximumWidth: Math.min(design.width - 48, layout.toast.width), opacity: (layout.toast.opacity ?? 1) * Math.max(0, opacity), yOffset });
          }
          ctx.restore();
          const live = document.querySelector("#trial-live-score"), text = core.getState().practiceStreak ? `\u5F53\u524D\u8FDE\u8FDB ${core.getState().practiceStreak.current} \u4E2A\uFF1B\u6700\u9AD8\u8FDE\u8FDB ${core.getState().practiceStreak.best} \u4E2A\uFF1B${message}` : `\u5355\u6746 ${core.getState().players[0].break} \u5206\uFF1B${message}`;
          if (live.textContent !== text) live.textContent = text;
        }
        if (!window.SnookerProduct) localSettings = require_settings().createPracticeSettings({ core, notice, requestFrame });
        const applyDeviceZoom = () => {
          if (!core.isReplay()) core.updateTuning({ aim: { peekFreeMaxZoom: window.SnookerPracticeSettings.focusZoom() } });
          requestFrame();
        };
        window.addEventListener("practice-settings-change", applyDeviceZoom);
        window.addEventListener("pagehide", () => window.removeEventListener("practice-settings-change", applyDeviceZoom), { once: true });
        update(performance.now());
        window.SnookerTrialLayout = { physicalDevice: runtime.physicalDevice, get device() {
          return runtime.device;
        }, preview: runtime.preview, profile: runtime.profile, getLayoutEditorElements: () => page() };
        runtime.ready();
        return {
          update,
          notice,
          getView,
          setView,
          setDifficulty(value) {
            if (core.canChangePracticeDifficulty?.() === false) return false;
            if (!DIFFICULTIES.some((d) => d.id === value)) return false;
            if (!core.updateTuning({ aim: trialTuning.aimValues(value) })) return false;
            difficultyId = value;
            menuOpen = difficultyOpen = false;
            return true;
          },
          frameActivity: () => frameState,
          difficulty: () => core.replayStatus()?.difficulty || difficultyId,
          isReplay: () => Boolean(replayUI?.watching),
          prepareReplay: () => replayUI?.prepare(),
          startReplay: () => replayUI?.start(),
          scale: () => scale,
          effectivePowerBarLayout() {
            const r = page().effectivePowerBar;
            if (!r) return null;
            const d = runtime.profile(), s = Math.min(innerWidth / d.width, innerHeight / d.height);
            return { ...r, x: (innerWidth - d.width * s) / 2 + r.x * s, y: (innerHeight - d.height * s) / 2 + r.y * s, width: r.width * s, height: r.height * s, preview: runtime.preview };
          },
          powerVisualScale: () => layout.powerPull?.visualScale || 1,
          powerContainerWidth: () => powerGeometry(layout.powerPull || { height: 356, width: 110, x: 0, y: 42 }, runtime.device === "mobile").containerWidth,
          referenceViewRect: () => {
            const d = runtime.sourceProfile(), s = Math.min(innerWidth / d.width, innerHeight / d.height), x = (innerWidth - d.width * s) / 2, y = (innerHeight - d.height * s) / 2;
            const items = footerKeys.map((k) => d.pages.game[k]).filter((r) => r && !r.hidden);
            const bottom = items.length ? Math.min(...items.map((r) => r.anchor === "bottom" ? d.height - r.height - (r.bottomInset ?? 16) : r.y)) - 16 : d.height - 100;
            return { left: x + 20 * s, top: y + 20 * s, right: x + (d.width - 20) * s, bottom: Math.min(y + bottom * s, replayUI?.watching ? (replayFooterTop?.width === innerWidth && replayFooterTop?.height === innerHeight ? replayFooterTop.top : innerHeight) - 16 : Infinity) };
          },
          viewRect() {
            const r = this.referenceViewRect();
            const d = runtime.sourceProfile(), s = Math.min(innerWidth / d.width, innerHeight / d.height), y = (innerHeight - d.height * s) / 2;
            return { ...r, bottom: Math.min(r.bottom, y + d.height * 880 / 1080 * s) };
          },
          centerCamera(camera) {
            const r = this.viewRect();
            const y = innerHeight / 2 - (r.top + r.bottom) / 2, v = camera.view;
            if (!v?.enabled || v.fullWidth !== innerWidth || v.fullHeight !== innerHeight || v.offsetX !== 0 || v.offsetY !== y) camera.setViewOffset(innerWidth, innerHeight, 0, y, innerWidth, innerHeight);
          },
          event(event) {
            if (event.type === "replay-exit") window.ProductMetrics?.ready("practice", window.SnookerProduct?.user);
            if (event.type === "reset" && core.isPractice() && !core.isReplay()) window.ProductMetrics?.practiceStart(core.getPracticeShape(), difficultyId);
            if (event.type === "shot-start") difficultyOpen = false;
            replayUI?.event(event);
            if (event.type === "replay-enter" || event.type === "replay-exit") {
              celebration?.clear();
              notices.clear();
              message = "";
            }
            if (replayUI?.watching) {
              if (event.type === "replay-seek" && event.freePlacement) notice("\u81EA\u7531\u6446\u7403\uFF1A\u5C55\u793A\u8C03\u6574\u524D\u540E\u7684\u4F4D\u7F6E");
              return;
            }
            if (event.type === "reset") {
              menuOpen = false;
              difficultyOpen = false;
              message = "";
              celebration?.clear();
              notices.clear();
            }
            if (event.type === "settled") {
              if (core.isPractice() && core.getState().frameOver) {
                const group = Practice.PRACTICE_SHAPES.find((s) => s.id === core.getPracticeShape())?.group;
                if (group === "\u5B9E\u6218\u7403\u578B" || group === "\u56F4\u7403\u7EC3\u4E60") {
                  celebration?.play();
                  requestFrame();
                }
              } else if (!core.getState().practiceStreak && (!window.SnookerOnline || window.SnookerOnline.isLocalPractice?.())) for (const text of createRuleResultMessages(core.getState(), event.result.ruleResult)) notice(text);
            }
          }
        };
      }
      window.SnookerTrialUI = { initialize };
      window.SnookerTrialTuning = require_tuning();
      window.SnookerPracticeSettings ||= require_device_preferences();
    }
  });
  require_ui();
  window.StandaloneNativeUI = { createVisualLayer: require_visual_layer().createVisualLayer, createPanels: require_panels2().createPanels, practiceShapeLabel: require_practiceMode().practiceShapeLabel, drawPracticeViews: require_practice_hud().drawPracticeViews };
})();
