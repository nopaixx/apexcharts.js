import DateTime from '../utils/DateTime'
import Utils from '../utils/Utils'

/**
 * ApexCharts Formatter Class for setting value formatters for axes as well as tooltips.
 *
 * @module Formatters
 **/

class Formatters {
  constructor(ctx) {
    this.ctx = ctx
    this.w = ctx.w
    this.tooltipKeyFormat = 'dd MMM'
  }

  xLabelFormat(fn, val, timestamp) {
    let w = this.w

    if (w.config.xaxis.type === 'datetime') {
      if (w.config.xaxis.labels.formatter === undefined) {
        // if user has not specified a custom formatter, use the default tooltip.x.format
        if (w.config.tooltip.x.formatter === undefined) {
          let datetimeObj = new DateTime(this.ctx)
          return datetimeObj.formatDate(
            datetimeObj.getUTCDate(val),
            w.config.tooltip.x.format
          )
        }
      }
    }

    return fn(val, timestamp)
  }

  setLabelFormatters() {
    let w = this.w

    const defaultFormatter = (val) => {
      if (Array.isArray(val)) {
        return val.map((v) => {
          return v
        })
      } else {
        return val
      }
    }
    w.globals.xLabelFormatter = function(val) {
      return defaultFormatter(val)
    }

    w.globals.xaxisTooltipFormatter = function(val) {
      return defaultFormatter(val)
    }

    w.globals.ttKeyFormatter = function(val) {
      return defaultFormatter(val)
    }

    w.globals.ttZFormatter = function(val) {
      return val
    }

    w.globals.legendFormatter = function(val) {
      return defaultFormatter(val)
    }

    // formatter function will always overwrite format property
    if (w.config.xaxis.labels.formatter !== undefined) {
      w.globals.xLabelFormatter = w.config.xaxis.labels.formatter
    } else {
      w.globals.xLabelFormatter = function(val) {
        if (Utils.isNumber(val)) {
          // numeric xaxis may have smaller range, so defaulting to 1 decimal
          if (
            !w.config.xaxis.convertedCatToNumeric &&
            w.config.xaxis.type === 'numeric' &&
            w.globals.dataPoints < 50
          ) {
            return val.toFixed(1)
          }
          if (w.globals.isBarHorizontal) {
            const range = w.globals.maxY - w.globals.minYArr
            if (range < 4) {
              return val.toFixed(1)
            }
          }
          return val.toFixed(0)
        }
        return val
      }
    }

    if (typeof w.config.tooltip.x.formatter === 'function') {
      w.globals.ttKeyFormatter = w.config.tooltip.x.formatter
    } else {
      w.globals.ttKeyFormatter = w.globals.xLabelFormatter
    }

    if (typeof w.config.xaxis.tooltip.formatter === 'function') {
      w.globals.xaxisTooltipFormatter = w.config.xaxis.tooltip.formatter
    }

    if (Array.isArray(w.config.tooltip.y)) {
      w.globals.ttVal = w.config.tooltip.y
    } else {
      if (w.config.tooltip.y.formatter !== undefined) {
        w.globals.ttVal = w.config.tooltip.y
      }
    }

    if (w.config.tooltip.z.formatter !== undefined) {
      w.globals.ttZFormatter = w.config.tooltip.z.formatter
    }

    // legend formatter - if user wants to append any global values of series to legend text
    if (w.config.legend.formatter !== undefined) {
      w.globals.legendFormatter = w.config.legend.formatter
    }

    // formatter function will always overwrite format property
    w.config.yaxis.forEach((yaxe, i) => {
      if (yaxe.labels.formatter !== undefined) {
        w.globals.yLabelFormatters[i] = yaxe.labels.formatter
      } else {
        w.globals.yLabelFormatters[i] = function(val) {
          if (!w.globals.xyCharts) return val

          const vf = (v) => {
            if (Utils.isNumber(v)) {
              if (w.globals.yValueDecimal !== 0) {
                v = v.toFixed(
                  yaxe.decimalsInFloat !== undefined
                    ? yaxe.decimalsInFloat
                    : w.globals.yValueDecimal
                )
              } else if (w.globals.maxYArr[i] - w.globals.minYArr[i] < 10) {
                v = v.toFixed(1)
              } else {
                v = v.toFixed(0)
              }
            }
            return v
          }

          if (Array.isArray(val)) {
            return val.map((v) => {
              return vf(v)
            })
          } else {
            return vf(val)
          }
        }
      }
    })

    return w.globals
  }

  heatmapLabelFormatters() {
    const w = this.w
    if (w.config.chart.type === 'heatmap') {
      w.globals.yAxisScale[0].result = w.globals.seriesNames.slice()

      //  get the longest string from the labels array and also apply label formatter to it
      let longest = w.globals.seriesNames.reduce(
        (a, b) => (a.length > b.length ? a : b),
        0
      )
      w.globals.yAxisScale[0].niceMax = longest
      w.globals.yAxisScale[0].niceMin = longest
    }
  }
}

export default Formatters
