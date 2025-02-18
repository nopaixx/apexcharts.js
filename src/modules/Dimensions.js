import Graphics from './Graphics'
import Formatters from '../modules/Formatters'
import Utils from './../utils/Utils'
import YAxis from './axes/YAxis'

/**
 * ApexCharts Dimensions Class for calculating rects of all elements that are drawn and will be drawn.
 *
 * @module Dimensions
 **/

export default class Dimensions {
  constructor(ctx) {
    this.ctx = ctx
    this.w = ctx.w
    this.lgRect = {}
    this.yAxisWidth = 0
    this.yAxisWidthLeft = 0
    this.yAxisWidthRight = 0
    this.xAxisHeight = 0
    this.isSparkline = this.w.config.chart.sparkline.enabled

    this.lgWidthForSideLegends = 0
    this.gridPad = this.w.config.grid.padding
    this.xPadRight = 0
    this.xPadLeft = 0
  }

  /**
   * @memberof Dimensions
   * @param {object} w - chart context
   **/
  plotCoords() {
    let w = this.w
    let gl = w.globals

    let lgRect = this.getLegendsRect()

    if (gl.axisCharts) {
      // for line / area / scatter / column
      this.setGridCoordsForAxisCharts(lgRect)
    } else {
      // for pie / donuts / circle
      this.setGridCoordsForNonAxisCharts(lgRect)
    }

    this.titleSubtitleOffset()

    // after calculating everything, apply padding set by user
    gl.gridHeight = gl.gridHeight - this.gridPad.top - this.gridPad.bottom

    gl.gridWidth =
      gl.gridWidth -
      this.gridPad.left -
      this.gridPad.right -
      this.xPadRight -
      this.xPadLeft

    // Below code is for automatically padding columns in zoomable charts.
    // Causes more issues, hence commented for now
    // let barWidth = this.paddingForColumnsInNumericAxis(gl.gridWidth)

    gl.gridWidth = gl.gridWidth //- barWidth * 2

    gl.translateX = gl.translateX + this.gridPad.left + this.xPadLeft //+ barWidth
    gl.translateY = gl.translateY + this.gridPad.top

    // gl.padHorizontal = 0 //this.xPadLeft
  }

  conditionalChecksForAxisCoords(xaxisLabelCoords, xtitleCoords) {
    const w = this.w
    this.xAxisHeight =
      (xaxisLabelCoords.height + xtitleCoords.height) *
        (w.globals.isMultiLineX ? 1.2 : w.globals.LINE_HEIGHT_RATIO) +
      15

    this.xAxisWidth = xaxisLabelCoords.width

    if (
      this.xAxisHeight - xtitleCoords.height >
      w.config.xaxis.labels.maxHeight
    ) {
      this.xAxisHeight = w.config.xaxis.labels.maxHeight
    }

    if (
      w.config.xaxis.labels.minHeight &&
      this.xAxisHeight < w.config.xaxis.labels.minHeight
    ) {
      this.xAxisHeight = w.config.xaxis.labels.minHeight
    }

    if (w.config.xaxis.floating) {
      this.xAxisHeight = 0
    }

    let minYAxisWidth = 0
    let maxYAxisWidth = 0
    w.config.yaxis.forEach((y) => {
      minYAxisWidth += y.labels.minWidth
      maxYAxisWidth += y.labels.maxWidth
    })
    if (this.yAxisWidth < minYAxisWidth) {
      this.yAxisWidth = minYAxisWidth
    }
    if (this.yAxisWidth > maxYAxisWidth) {
      this.yAxisWidth = maxYAxisWidth
    }
  }

  setGridCoordsForAxisCharts(lgRect) {
    let w = this.w
    let gl = w.globals

    let yaxisLabelCoords = this.getyAxisLabelsCoords()
    let yTitleCoords = this.getyAxisTitleCoords()

    w.globals.yLabelsCoords = []
    w.globals.yTitleCoords = []
    w.config.yaxis.map((yaxe, index) => {
      // store the labels and titles coords in global vars
      w.globals.yLabelsCoords.push({
        width: yaxisLabelCoords[index].width,
        index
      })
      w.globals.yTitleCoords.push({
        width: yTitleCoords[index].width,
        index
      })
    })

    this.yAxisWidth = this.getTotalYAxisWidth()

    let xaxisLabelCoords = this.getxAxisLabelsCoords()
    let xtitleCoords = this.getxAxisTitleCoords()

    this.conditionalChecksForAxisCoords(xaxisLabelCoords, xtitleCoords)

    gl.translateXAxisY = w.globals.rotateXLabels ? this.xAxisHeight / 8 : -4
    gl.translateXAxisX =
      w.globals.rotateXLabels &&
      w.globals.isXNumeric &&
      w.config.xaxis.labels.rotate <= -45
        ? -this.xAxisWidth / 4
        : 0

    if (w.globals.isBarHorizontal) {
      gl.rotateXLabels = false
      gl.translateXAxisY =
        -1 * (parseInt(w.config.xaxis.labels.style.fontSize, 10) / 1.5)
    }

    gl.translateXAxisY = gl.translateXAxisY + w.config.xaxis.labels.offsetY
    gl.translateXAxisX = gl.translateXAxisX + w.config.xaxis.labels.offsetX

    let yAxisWidth = this.yAxisWidth
    let xAxisHeight = this.xAxisHeight
    gl.xAxisLabelsHeight = this.xAxisHeight
    gl.xAxisHeight = this.xAxisHeight
    let translateY = 10

    if (w.config.chart.type === 'radar' || this.isSparkline) {
      yAxisWidth = 0
      xAxisHeight = gl.goldenPadding
    }

    if (this.isSparkline) {
      lgRect = {
        height: 0,
        width: 0
      }
      xAxisHeight = 0
      yAxisWidth = 0
      translateY = 0
    }

    this.additionalPaddingXLabels(xaxisLabelCoords)

    const legendTopBottom = () => {
      gl.translateX = yAxisWidth
      gl.gridHeight =
        gl.svgHeight -
        lgRect.height -
        xAxisHeight -
        (!this.isSparkline ? (w.globals.rotateXLabels ? 10 : 15) : 0)
      gl.gridWidth = gl.svgWidth - yAxisWidth
    }
    switch (w.config.legend.position) {
      case 'bottom':
        gl.translateY = translateY
        legendTopBottom()
        break
      case 'top':
        gl.translateY = lgRect.height + translateY
        legendTopBottom()
        break
      case 'left':
        gl.translateY = translateY
        gl.translateX = lgRect.width + yAxisWidth
        gl.gridHeight = gl.svgHeight - xAxisHeight - 12
        gl.gridWidth = gl.svgWidth - lgRect.width - yAxisWidth
        break
      case 'right':
        gl.translateY = translateY
        gl.translateX = yAxisWidth
        gl.gridHeight = gl.svgHeight - xAxisHeight - 12
        gl.gridWidth = gl.svgWidth - lgRect.width - yAxisWidth - 5
        break
      default:
        throw new Error('Legend position not supported')
    }

    this.setGridXPosForDualYAxis(yTitleCoords, yaxisLabelCoords)

    // after drawing everything, set the Y axis positions
    let objyAxis = new YAxis(this.ctx)
    objyAxis.setYAxisXPosition(yaxisLabelCoords, yTitleCoords)
  }

  setGridCoordsForNonAxisCharts(lgRect) {
    let w = this.w
    let gl = w.globals
    let cnf = w.config
    let xPad = 0

    if (w.config.legend.show && !w.config.legend.floating) {
      xPad = 20
    }

    const type =
      cnf.chart.type === 'pie' || cnf.chart.type === 'donut'
        ? 'pie'
        : 'radialBar'

    let offY = 10 + cnf.plotOptions[type].offsetY
    let offX = cnf.plotOptions[type].offsetX

    if (!cnf.legend.show || cnf.legend.floating) {
      gl.gridHeight = gl.svgHeight - gl.goldenPadding
      gl.gridWidth = gl.gridHeight

      gl.translateY = offY - 10
      gl.translateX = offX + (gl.svgWidth - gl.gridWidth) / 2

      return
    }

    switch (cnf.legend.position) {
      case 'bottom':
        gl.gridHeight = gl.svgHeight - lgRect.height - gl.goldenPadding
        gl.gridWidth = gl.gridHeight
        gl.translateY = offY - 20
        gl.translateX = offX + (gl.svgWidth - gl.gridWidth) / 2
        break
      case 'top':
        gl.gridHeight = gl.svgHeight - lgRect.height - gl.goldenPadding
        gl.gridWidth = gl.gridHeight
        gl.translateY = lgRect.height + offY + 10
        gl.translateX = offX + (gl.svgWidth - gl.gridWidth) / 2
        break
      case 'left':
        gl.gridWidth = gl.svgWidth - lgRect.width - xPad
        gl.gridHeight =
          cnf.chart.height !== 'auto' ? gl.svgHeight : gl.gridWidth
        gl.translateY = offY
        gl.translateX = offX + lgRect.width + xPad
        break
      case 'right':
        gl.gridWidth = gl.svgWidth - lgRect.width - xPad - 5
        gl.gridHeight =
          cnf.chart.height !== 'auto' ? gl.svgHeight : gl.gridWidth
        gl.translateY = offY
        gl.translateX = offX + 10
        break
      default:
        throw new Error('Legend position not supported')
    }
  }

  setGridXPosForDualYAxis(yTitleCoords, yaxisLabelCoords) {
    let w = this.w
    w.config.yaxis.map((yaxe, index) => {
      if (
        w.globals.ignoreYAxisIndexes.indexOf(index) === -1 &&
        !w.config.yaxis[index].floating &&
        w.config.yaxis[index].show
      ) {
        if (yaxe.opposite) {
          w.globals.translateX =
            w.globals.translateX -
            (yaxisLabelCoords[index].width + yTitleCoords[index].width) -
            parseInt(w.config.yaxis[index].labels.style.fontSize, 10) / 1.2 -
            12
        }
      }
    })
  }

  // paddingForColumnsInNumericAxis(gridWidth) {
  //   const w = this.w

  //   const type = w.config.chart.type
  //   // const gridWidth =
  //   //   w.globals.svgWidth -
  //   //   this.lgWidthForSideLegends -
  //   //   this.yAxisWidth -
  //   //   this.gridPad.right -
  //   //   this.gridPad.left -
  //   //   60

  //   let barWidth = 0
  //   let seriesLen =
  //     type === 'bar' || type === 'rangeBar' ? w.config.series.length : 1

  //   if (w.globals.comboBarCount > 0) {
  //     seriesLen = w.globals.comboBarCount
  //   }
  //   w.globals.collapsedSeries.forEach((c) => {
  //     if (c.type === 'bar' || c.type === 'rangeBar') {
  //       seriesLen = seriesLen - 1
  //     }
  //   })
  //   if (w.config.chart.stacked) {
  //     seriesLen = 1
  //   }

  //   const hasBar =
  //     type === 'bar' || type === 'rangeBar' || w.globals.comboBarCount > 0

  //   if (
  //     hasBar &&
  //     w.globals.isXNumeric &&
  //     !w.globals.isBarHorizontal &&
  //     seriesLen > 0
  //   ) {
  //     let xRatio = 0
  //     let xRange = Math.abs(w.globals.initialMaxX - w.globals.initialMinX)

  //     xRatio = xRange / gridWidth

  //     let xDivision
  //     // max barwidth should be equal to minXDiff to avoid overlap
  //     if (w.globals.minXDiff && w.globals.minXDiff / xRatio > 0) {
  //       xDivision = w.globals.minXDiff / xRatio
  //     }

  //     // barWidth = xDivision / seriesLen

  //     barWidth =
  //       ((xDivision / seriesLen) *
  //         parseInt(w.config.plotOptions.bar.columnWidth, 10)) /
  //       100

  //     if (barWidth < 1) {
  //       barWidth = 1
  //     }

  //     w.globals.barPadForNumericAxis = barWidth
  //   }
  //   return barWidth
  // }

  // In certain cases, the last labels gets cropped in xaxis.
  // Hence, we add some additional padding based on the label length to avoid the last label being cropped or we don't draw it at all
  additionalPaddingXLabels(xaxisLabelCoords) {
    const w = this.w
    const gl = w.globals
    const cnf = w.config
    const xtype = cnf.xaxis.type
    const lbWidth = xaxisLabelCoords.width

    gl.skipLastTimelinelabel = false
    gl.skipFirstTimelinelabel = false
    const isBarOpposite =
      w.config.yaxis[0].opposite && w.globals.isBarHorizontal

    const isCollapsed = (i) => gl.collapsedSeriesIndices.indexOf(i) !== -1

    const rightPad = (yaxe) => {
      if (this.timescaleLabels && this.timescaleLabels.length) {
        // for timeline labels, we take the last label and check if it exceeds gridWidth
        const firstimescaleLabel = this.timescaleLabels[0]
        const lastTimescaleLabel = this.timescaleLabels[
          this.timescaleLabels.length - 1
        ]

        const lastLabelPosition =
          lastTimescaleLabel.position + lbWidth / 1.75 + this.yAxisWidthRight

        const firstLabelPosition =
          firstimescaleLabel.position -
          lbWidth / 1.75 +
          (yaxe.opposite ? 0 : this.yAxisWidthLeft)

        if (lastLabelPosition > gl.gridWidth) {
          gl.skipLastTimelinelabel = true
        }
        if (firstLabelPosition < 0) {
          gl.skipFirstTimelinelabel = true
        }
      } else if (xtype === 'datetime') {
        // If user has enabled DateTime, but uses own's formatter
        if (this.gridPad.right < lbWidth) {
          gl.skipLastTimelinelabel = true
        }
      } else if (xtype !== 'datetime' && !cnf.xaxis.convertedCatToNumeric) {
        if (
          this.gridPad.right < lbWidth / 2 - this.yAxisWidthRight &&
          !gl.rotateXLabels
        ) {
          this.xPadRight = lbWidth / 2 + 1
        }
      }
    }

    const padYAxe = (yaxe, i) => {
      if (isCollapsed(i)) return

      if (xtype !== 'datetime') {
        if (
          this.gridPad.left < lbWidth / 2 - this.yAxisWidthLeft &&
          !gl.rotateXLabels
        ) {
          this.xPadLeft = lbWidth / 2 + 1
        }
      }

      rightPad(yaxe)
    }

    cnf.yaxis.forEach((yaxe, i) => {
      if (isBarOpposite) {
        if (this.gridPad.left < lbWidth) {
          this.xPadLeft = lbWidth / 2 + 1
        }
        this.xPadRight = lbWidth / 2 + 1
      } else {
        padYAxe(yaxe, i)
      }
    })
  }

  titleSubtitleOffset() {
    const w = this.w
    const gl = w.globals
    let gridShrinkOffset = this.isSparkline || !w.globals.axisCharts ? 0 : 10

    const titleSubtitle = ['title', 'subtitle']

    titleSubtitle.forEach((t) => {
      if (w.config[t].text !== undefined) {
        gridShrinkOffset += w.config[t].margin
      } else {
        gridShrinkOffset += this.isSparkline || !w.globals.axisCharts ? 0 : 5
      }
    })

    const nonAxisOrMultiSeriesCharts =
      w.config.series.length > 1 ||
      !w.globals.axisCharts ||
      w.config.legend.showForSingleSeries

    if (
      w.config.legend.show &&
      w.config.legend.position === 'bottom' &&
      !w.config.legend.floating &&
      nonAxisOrMultiSeriesCharts
    ) {
      gridShrinkOffset += 10
    }

    let titleCoords = this.getTitleSubtitleCoords('title')
    let subtitleCoords = this.getTitleSubtitleCoords('subtitle')

    gl.gridHeight =
      gl.gridHeight -
      titleCoords.height -
      subtitleCoords.height -
      gridShrinkOffset

    gl.translateY =
      gl.translateY +
      titleCoords.height +
      subtitleCoords.height +
      gridShrinkOffset
  }

  getTotalYAxisWidth() {
    let w = this.w
    let yAxisWidth = 0
    let yAxisWidthLeft = 0
    let yAxisWidthRight = 0
    let padding = w.globals.yAxisScale.length > 1 ? 10 : 0

    const isHiddenYAxis = function(index) {
      return w.globals.ignoreYAxisIndexes.indexOf(index) > -1
    }

    const padForLabelTitle = (coord, index) => {
      let floating = w.config.yaxis[index].floating
      let width = 0

      if (coord.width > 0 && !floating) {
        width = coord.width + padding
        if (isHiddenYAxis(index)) {
          width = width - coord.width - padding
        }
      } else {
        width = floating || !w.config.yaxis[index].show ? 0 : 5
      }

      w.config.yaxis[index].opposite
        ? (yAxisWidthRight = yAxisWidthRight + width)
        : (yAxisWidthLeft = yAxisWidthLeft + width)

      yAxisWidth = yAxisWidth + width
    }

    w.globals.yLabelsCoords.map((yLabelCoord, index) => {
      padForLabelTitle(yLabelCoord, index)
    })

    w.globals.yTitleCoords.map((yTitleCoord, index) => {
      padForLabelTitle(yTitleCoord, index)
    })

    if (w.globals.isBarHorizontal) {
      yAxisWidth =
        w.globals.yLabelsCoords[0].width + w.globals.yTitleCoords[0].width + 15
    }

    this.yAxisWidthLeft = yAxisWidthLeft
    this.yAxisWidthRight = yAxisWidthRight

    return yAxisWidth
  }

  getxAxisTimeScaleLabelsCoords() {
    let w = this.w
    let rect

    this.timescaleLabels = w.globals.timescaleLabels.slice()

    let labels = this.timescaleLabels.map((label) => label.value)

    //  get the longest string from the labels array and also apply label formatter to it
    let val = labels.reduce((a, b) => {
      // if undefined, maybe user didn't pass the datetime(x) values
      if (typeof a === 'undefined') {
        console.error(
          'You have possibly supplied invalid Date format. Please supply a valid JavaScript Date'
        )
        return 0
      } else {
        return a.length > b.length ? a : b
      }
    }, 0)

    let graphics = new Graphics(this.ctx)
    rect = graphics.getTextRects(val, w.config.xaxis.labels.style.fontSize)

    let totalWidthRotated = rect.width * 1.05 * labels.length

    if (
      totalWidthRotated > w.globals.gridWidth &&
      w.config.xaxis.labels.rotate !== 0
    ) {
      w.globals.overlappingXLabels = true
    }

    return rect
  }

  /**
   * Get X Axis Dimensions
   * @memberof Dimensions
   * @return {{width, height}}
   **/
  getxAxisLabelsCoords() {
    let w = this.w

    let xaxisLabels = w.globals.labels.slice()
    let rect

    if (w.globals.timescaleLabels.length > 0) {
      const coords = this.getxAxisTimeScaleLabelsCoords()
      rect = {
        width: coords.width,
        height: coords.height
      }
    } else {
      this.lgWidthForSideLegends =
        (w.config.legend.position === 'left' ||
          w.config.legend.position === 'right') &&
        !w.config.legend.floating
          ? this.lgRect.width
          : 0

      // get the longest string from the labels array and also apply label formatter
      let xlbFormatter = w.globals.xLabelFormatter
      // prevent changing xaxisLabels to avoid issues in multi-yaxes - fix #522
      let val = Utils.getLargestStringFromArr(xaxisLabels)
      let valArr = val

      if (w.globals.isMultiLineX) {
        // if the xaxis labels has multiline texts (array)
        let maxArrs = xaxisLabels.map((xl, idx) => {
          return Array.isArray(xl) ? xl.length : 1
        })
        let maxArrLen = Math.max(...maxArrs)
        let maxArrIndex = maxArrs.indexOf(maxArrLen)
        valArr = xaxisLabels[maxArrIndex]
      }

      // the labels gets changed for bar charts
      if (w.globals.isBarHorizontal) {
        val = w.globals.yAxisScale[0].result.reduce(
          (a, b) => (a.length > b.length ? a : b),
          0
        )
        valArr = val
      }

      let xFormat = new Formatters(this.ctx)
      let timestamp = val
      val = xFormat.xLabelFormat(xlbFormatter, val, timestamp)
      valArr = xFormat.xLabelFormat(xlbFormatter, valArr, timestamp)

      let graphics = new Graphics(this.ctx)

      let xLabelrect = graphics.getTextRects(
        val,
        w.config.xaxis.labels.style.fontSize
      )
      let xArrLabelrect = xLabelrect
      if (val !== valArr) {
        xArrLabelrect = graphics.getTextRects(
          valArr,
          w.config.xaxis.labels.style.fontSize
        )
      }

      rect = {
        width:
          xLabelrect.width >= xArrLabelrect.width
            ? xLabelrect.width
            : xArrLabelrect.width,
        height:
          xLabelrect.height >= xArrLabelrect.height
            ? xLabelrect.height
            : xArrLabelrect.height
      }

      if (
        rect.width * xaxisLabels.length >
          w.globals.svgWidth -
            this.lgWidthForSideLegends -
            this.yAxisWidth -
            this.gridPad.left -
            this.gridPad.right &&
        w.config.xaxis.labels.rotate !== 0
      ) {
        if (!w.globals.isBarHorizontal) {
          w.globals.rotateXLabels = true
          const getRotatedTextRects = (text) => {
            return graphics.getTextRects(
              text,
              w.config.xaxis.labels.style.fontSize,
              w.config.xaxis.labels.style.fontFamily,
              `rotate(${w.config.xaxis.labels.rotate} 0 0)`,
              false
            )
          }
          xLabelrect = getRotatedTextRects(val)
          if (val !== valArr) {
            xArrLabelrect = getRotatedTextRects(valArr)
          }

          rect.height =
            (xLabelrect.height > xArrLabelrect.height
              ? xLabelrect.height
              : xArrLabelrect.height) / 1.5
          rect.width =
            xLabelrect.width > xArrLabelrect.width
              ? xLabelrect.width
              : xArrLabelrect.width
        }
      } else {
        w.globals.rotateXLabels = false
      }
    }

    if (!w.config.xaxis.labels.show) {
      rect = {
        width: 0,
        height: 0
      }
    }

    return {
      width: rect.width,
      height: rect.height
    }
  }

  /**
   * Get Y Axis Dimensions
   * @memberof Dimensions
   * @return {{width, height}}
   **/
  getyAxisLabelsCoords() {
    let w = this.w

    let width = 0
    let height = 0
    let ret = []
    let labelPad = 10

    w.config.yaxis.map((yaxe, index) => {
      if (
        yaxe.show &&
        yaxe.labels.show &&
        w.globals.yAxisScale[index].result.length
      ) {
        let lbFormatter = w.globals.yLabelFormatters[index]

        // the second parameter -1 is the index of tick which user can use in the formatter
        let val = lbFormatter(w.globals.yAxisScale[index].niceMax, {
          seriesIndex: index,
          dataPointIndex: -1,
          w
        })
        let valArr = val

        // if user has specified a custom formatter, and the result is null or empty, we need to discard the formatter and take the value as it is.
        if (typeof val === 'undefined' || val.length === 0) {
          val = w.globals.yAxisScale[index].niceMax
        }

        if (w.globals.isBarHorizontal) {
          labelPad = 0

          let barYaxisLabels = w.globals.labels.slice()

          //  get the longest string from the labels array and also apply label formatter to it
          val = Utils.getLargestStringFromArr(barYaxisLabels)

          val = lbFormatter(val, { seriesIndex: index, dataPointIndex: -1, w })
          valArr = val

          if (w.globals.isMultiLineX) {
            // if the xaxis labels has multiline texts (array)
            let maxArrs = barYaxisLabels.map((xl, idx) => {
              return Array.isArray(xl) ? xl.length : 1
            })
            let maxArrLen = Math.max(...maxArrs)
            let maxArrIndex = maxArrs.indexOf(maxArrLen)
            valArr = barYaxisLabels[maxArrIndex]
          }
        }

        let graphics = new Graphics(this.ctx)
        let rect = graphics.getTextRects(val, yaxe.labels.style.fontSize)
        let arrLabelrect = rect

        if (val !== valArr) {
          arrLabelrect = graphics.getTextRects(
            valArr,
            yaxe.labels.style.fontSize
          )
        }

        ret.push({
          width:
            (arrLabelrect.width > rect.width
              ? arrLabelrect.width
              : rect.width) + labelPad,
          height:
            arrLabelrect.height > rect.height
              ? arrLabelrect.height
              : rect.height
        })
      } else {
        ret.push({
          width,
          height
        })
      }
    })

    return ret
  }

  /**
   * Get X Axis Title Dimensions
   * @memberof Dimensions
   * @return {{width, height}}
   **/
  getxAxisTitleCoords() {
    let w = this.w
    let width = 0
    let height = 0

    if (w.config.xaxis.title.text !== undefined) {
      let graphics = new Graphics(this.ctx)

      let rect = graphics.getTextRects(
        w.config.xaxis.title.text,
        w.config.xaxis.title.style.fontSize
      )

      width = rect.width
      height = rect.height
    }

    return {
      width,
      height
    }
  }

  /**
   * Get Y Axis Dimensions
   * @memberof Dimensions
   * @return {{width, height}}
   **/
  getyAxisTitleCoords() {
    let w = this.w
    let ret = []

    w.config.yaxis.map((yaxe, index) => {
      if (yaxe.show && yaxe.title.text !== undefined) {
        let graphics = new Graphics(this.ctx)
        let rect = graphics.getTextRects(
          yaxe.title.text,
          yaxe.title.style.fontSize,
          yaxe.title.style.fontFamily,
          'rotate(-90 0 0)',
          false
        )

        ret.push({
          width: rect.width,
          height: rect.height
        })
      } else {
        ret.push({
          width: 0,
          height: 0
        })
      }
    })

    return ret
  }

  /**
   * Get Chart Title/Subtitle Dimensions
   * @memberof Dimensions
   * @return {{width, height}}
   **/
  getTitleSubtitleCoords(type) {
    let w = this.w
    let width = 0
    let height = 0

    const floating =
      type === 'title' ? w.config.title.floating : w.config.subtitle.floating

    let el = w.globals.dom.baseEl.querySelector(`.apexcharts-${type}-text`)

    if (el !== null && !floating) {
      let coord = el.getBoundingClientRect()
      width = coord.width
      height = w.globals.axisCharts ? coord.height + 5 : coord.height
    }

    return {
      width,
      height
    }
  }

  getLegendsRect() {
    let w = this.w

    let elLegendWrap = w.globals.dom.baseEl.querySelector('.apexcharts-legend')
    let lgRect = Object.assign({}, Utils.getBoundingClientRect(elLegendWrap))

    if (
      elLegendWrap !== null &&
      !w.config.legend.floating &&
      w.config.legend.show
    ) {
      this.lgRect = {
        x: lgRect.x,
        y: lgRect.y,
        height: lgRect.height,
        width: lgRect.height === 0 ? 0 : lgRect.width
      }
    } else {
      this.lgRect = {
        x: 0,
        y: 0,
        height: 0,
        width: 0
      }
    }

    // if legend takes up all of the chart space, we need to restrict it.
    if (
      w.config.legend.position === 'left' ||
      w.config.legend.position === 'right'
    ) {
      if (this.lgRect.width * 1.5 > w.globals.svgWidth) {
        this.lgRect.width = w.globals.svgWidth / 1.5
      }
    }

    return this.lgRect
  }
}
