(() => {
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __commonJS = (cb, mod) => function __require() {
    try {
      return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
    } catch (e) {
      throw mod = 0, e;
    }
  };

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
                  text: "\u65af\u8bfa\u77f3\u72ee\u4e09\u5251\u514b 3D \u7EC3\u7403\u623F",
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
                  text: "\u65af\u8bfa\u77f3\u72ee\u4e09\u5251\u514b 3D \u7EC3\u7403\u623F",
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
                      text: "\u65af\u8bfa\u77f3\u72ee\u4e09\u5251\u514b 3D \u7EC3\u7403\u623F",
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
            title: { x: width * 0.06, y: height * 0.35, width: width * 0.88, height: portrait ? 160 : 90, fontSize: portrait ? 64 : mobile ? 72 : 56, text: "\u65af\u8bfa\u77f3\u72ee\u4e09\u5251\u514b 3D \u7EC3\u7403\u623F", color: "#eee5cd", opacity: 1 },
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

  // apps/three-game/trial/layout-page.cjs
  var require_layout_page = __commonJS({
    "apps/three-game/trial/layout-page.cjs"() {
      var { createLayoutRuntime } = require_layout_runtime();
      var params = new URLSearchParams(location.search);
      var preview = window.parent !== window && params.has("layoutEditorPreview");
      var loadingPreview = preview && params.get("layoutEditorPreview") === "loading";
      window.ThreeTrialPageLayoutReady = createLayoutRuntime().then((runtime) => {
        window.ThreeTrialPageLayout = runtime;
        let frame, lastKey = "";
        function update() {
          const loading = document.getElementById("loading");
          if (!loading) return;
          const profile = runtime.profile(), page = runtime.page("loading");
          const key = JSON.stringify([innerWidth, innerHeight, page]);
          if (key !== lastKey) {
            lastKey = key;
            const scale = Math.min(innerWidth / profile.width, innerHeight / profile.height), ox = (innerWidth - profile.width * scale) / 2, oy = (innerHeight - profile.height * scale) / 2;
            const nodes = { title: document.getElementById("loading-title"), guide: document.getElementById("loading-guide"), startButton: document.querySelector(".loading__progress") };
            for (const [name, node] of Object.entries(nodes)) {
              const r = page[name];
              if (!r || !node) continue;
              Object.assign(node.style, { position: "absolute", margin: "0", padding: "0", boxSizing: "border-box", left: `${ox + r.x * scale}px`, top: `${oy + r.y * scale}px`, width: `${r.width * scale}px`, height: `${r.height * scale}px`, fontSize: `${(r.fontSize || 36) * scale}px`, lineHeight: "1.35", fontFamily: r.fontFamily || "system-ui, sans-serif", color: r.color || "", opacity: String(r.opacity ?? 1), visibility: r.hidden ? "hidden" : "visible", display: "grid", placeItems: "center", textAlign: "center", whiteSpace: "pre-wrap" });
              if (name !== "startButton" && typeof r.text === "string") node.textContent = r.text;
              if (name === "startButton") {
                const button = document.getElementById("loading-start"), label = document.getElementById("loading-percent");
                button.style.height = "100%";
                label.style.fontSize = `${(r.fontSize || 36) * scale}px`;
              }
            }
          }
          frame = requestAnimationFrame(update);
        }
        if (loadingPreview) {
          const ready = params.get("layoutEditorLoadingState") === "ready";
          const button = document.getElementById("loading-start");
          button.disabled = !ready;
          document.getElementById("loading-bar").style.width = ready ? "100%" : "65%";
          document.getElementById("loading-percent").textContent = ready ? "\u5F00\u59CB\u6E38\u620F" : "65%";
          button.setAttribute("aria-valuenow", ready ? "100" : "65");
          window.SnookerTrialLayout = { device: runtime.device, preview: true, getLayoutEditorElements: () => runtime.page("loading") };
        }
        update();
        runtime.ready();
        window.addEventListener("pagehide", () => cancelAnimationFrame(frame), { once: true });
        return runtime;
      }).catch((error) => {
        window.reportThreeLoadingError?.(error);
        throw error;
      });
    }
  });
  require_layout_page();
})();
