/**
 * Datart
 *
 * Copyright 2021
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import Chart from 'app/pages/ChartWorkbenchPage/models/Chart';
import ChartConfig, {
  ChartDataSectionType,
} from 'app/pages/ChartWorkbenchPage/models/ChartConfig';
import ChartDataset from 'app/pages/ChartWorkbenchPage/models/ChartDataset';
import {
  getStyleValueByGroup,
  getValueByColumnKey,
  transfromToObjectArray,
} from 'app/utils/chart';
import { init } from 'echarts';
import { isEmpty } from 'utils/object';
import Config from './config';

export const DEFAULT_FONT_WEIGHT = 'normal';
export const DEFAULT_FONT_STYLE = 'normal';
export const DEFAULT_FONT_SIZE = '14px';
export const DEFAULT_FONT_FAMILY =
  '"Chinese Quote", -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"';

class ScoreChart extends Chart {
  chart: any = null;
  config = Config;
  utilCanvas = null;
  boardTypes = ['header', 'body', 'footer'];

  constructor(props?) {
    super(
      props?.id || 'score-chart',
      props?.name || '翻牌器',
      props?.icon || 'fanpaiqi',
    );
    this.meta.requirements = props?.requirements || [
      {
        group: 0,
        aggregate: [1, 3],
      },
    ];
  }

  onMount(options, context): void {
    if (options.containerId === undefined || !context.document) {
      return;
    }

    this.chart = init(
      context.document.getElementById(options.containerId),
      'default',
    );
    this._mouseEvents?.forEach(event => {
      this.chart.on(event.name, event.callback);
    });
  }

  onUpdated(props, context): void {
    if (!props.dataset || !props.dataset.columns || !props.config) {
      return;
    }
    if (!this.isMatchRequirement(props.config)) {
      this.chart?.clear();
      return;
    }
    const newOptions = this.getOptions(props.dataset, props.config, context);
    this.chart?.setOption(Object.assign({}, newOptions), true);
  }

  onUnMount(): void {
    this.chart?.dispose();
  }

  onResize(opt: any, context): void {
    this.chart?.resize(context);
  }

  getOptions(dataset: ChartDataset, config: ChartConfig, context) {
    const styleConfigs = config.styles;
    const dataConfigs = config.datas || [];
    const aggregateConfigs = dataConfigs
      .filter(c => c.type === ChartDataSectionType.AGGREGATE)
      .flatMap(config => config.rows || []);

    const objDataColumns = transfromToObjectArray(
      dataset.rows,
      dataset.columns,
    );

    const aggConfigValues = aggregateConfigs.map(config => {
      return objDataColumns[0]?.[getValueByColumnKey(config)];
    });

    const customFormatters = aggConfigValues
      .map((content, index) => {
        const typeKey = this.getBoardTypes(aggregateConfigs?.length)[index];
        const texts = this.getLineContent(styleConfigs, typeKey);
        if (!texts.show) {
          return null;
        }
        return [
          texts.prefixText &&
            `{${typeKey + 'PrefixStyle'}|${texts.prefixText}}`,
          `{${typeKey + 'ContentStyle'}|${content}}`,
          texts.suffixText &&
            `{${typeKey + 'SuffixStyle'}|${texts.suffixText}}`,
        ]
          .filter(Boolean)
          .join('');
      })
      .filter(Boolean)
      .join('\n');

    const allTexts: string[] =
      this.getBoardTypes(aggregateConfigs?.length).flatMap((bType, index) => {
        const texts = this.getLineContent(styleConfigs, bType);
        const content = isEmpty(aggConfigValues?.[index])
          ? ''
          : aggConfigValues?.[index];
        return [texts.prefixText, content, texts.suffixText];
      }) || [];

    const { basicFontSize, bodyContentFontSize } = this.computeFontSize(
      context,
      { width: this.chart?.getWidth(), height: this.chart?.getHeight() },
    ).apply(null, allTexts as any);

    const richStyles = aggConfigValues
      .flatMap((_, index) => {
        const typeKey = this.getBoardTypes(aggregateConfigs?.length)[index];
        const styles = this.getLineStyle(
          styleConfigs,
          typeKey,
          basicFontSize,
          bodyContentFontSize,
        );
        return [
          {
            key: `${typeKey + 'PrefixStyle'}`,
            value: { ...styles.prefixFont },
          },
          { key: `${typeKey + 'ContentStyle'}`, value: { ...styles.font } },
          {
            key: `${typeKey + 'SuffixStyle'}`,
            value: { ...styles.suffixFont },
          },
        ];
      })
      .reduce((acc, cur) => {
        acc[cur.key] = cur.value;
        return acc;
      }, {});

    return {
      series: [
        {
          type: 'scatter',
          data: [[0, 0]],
          symbolSize: 1,
          label: {
            normal: {
              show: true,
              formatter: customFormatters,
              rich: richStyles,
            },
          },
        },
      ],
      xAxis: {
        axisLabel: { show: false },
        axisLine: { show: false },
        splitLine: { show: false },
        axisTick: { show: false },
        min: -1,
        max: 1,
      },
      yAxis: {
        axisLabel: { show: false },
        axisLine: { show: false },
        splitLine: { show: false },
        axisTick: { show: false },
        min: -1,
        max: 1,
      },
    };
  }

  getLineStyle(styles, typeName, basicFontSize, bodyContentFontSize) {
    const { show, prefixText, suffixText } = this.getLineContent(
      styles,
      typeName,
    );
    let font = getStyleValueByGroup(styles, typeName, 'font');
    let prefixFont = getStyleValueByGroup(styles, typeName, 'prefxFont');
    let suffixFont = getStyleValueByGroup(styles, typeName, 'suffixFont');

    const isFixedFontSize = getStyleValueByGroup(
      styles,
      'common',
      'isFixedFontSize',
    );
    if (isFixedFontSize) {
      const fixedFontSize = getStyleValueByGroup(
        styles,
        'common',
        `${typeName}FontSize`,
      );

      font = Object.assign({}, font, { fontSize: fixedFontSize });
      prefixFont = Object.assign({}, prefixFont, { fontSize: fixedFontSize });
      suffixFont = Object.assign({}, suffixFont, { fontSize: fixedFontSize });
    } else {
      font = Object.assign({}, font, {
        fontSize:
          typeName === this.boardTypes[1] ? bodyContentFontSize : basicFontSize,
      });
      prefixFont = Object.assign({}, prefixFont, { fontSize: basicFontSize });
      suffixFont = Object.assign({}, suffixFont, { fontSize: basicFontSize });
    }

    return {
      show,
      font,
      prefixText,
      prefixFont,
      suffixText,
      suffixFont,
    };
  }

  getLineContent(styles, typeName) {
    const show = getStyleValueByGroup(styles, typeName, 'show');
    const prefixText =
      getStyleValueByGroup(styles, typeName, 'prefixText') || '';
    const suffixText =
      getStyleValueByGroup(styles, typeName, 'suffixText') || '';

    return {
      show,
      prefixText,
      suffixText,
    };
  }

  private computeFontSize =
    (context, style) =>
    (
      prefixHeader: string,
      headerText: string,
      suffixHeader: string,
      prefixContent: string,
      contentText: string,
      suffixContent: string,
      prefixFooter: string,
      footerText: string,
      suffixFooter: string,
    ): {
      basicFontSize: number;
      bodyContentFontSize: number;
    } => {
      const hasHeader = prefixHeader || headerText || suffixHeader;
      const hasContent = prefixContent || contentText || suffixContent;
      const hasFooter = prefixFooter || footerText || suffixFooter;

      const { width, height } = style;

      const maxPartSize = 16;
      const exactWidth =
        width * (width <= 150 ? 1 : width <= 250 ? 0.9 : 0.7) - 16 * 2;
      const sumPartsW = Math.max(
        this.getTextWidth(
          context,
          prefixHeader + headerText + suffixHeader,
          '',
          '12px',
        ),
        this.getTextWidth(context, prefixContent + suffixContent, '', '12px') +
          this.getTextWidth(context, contentText, '', '32px'),
        this.getTextWidth(
          context,
          prefixFooter + footerText + suffixFooter,
          '',
          '12px',
          context,
        ),
      );

      const exactHeight =
        height * (height <= 150 ? 1 : height <= 250 ? 0.9 : 0.7) - 40;
      const sumPartsH =
        (hasHeader ? 3 : 0) + (hasContent ? 8 : 0) + (hasFooter ? 3 : 0);
      const gapH = 8;
      const sumGapH =
        (hasHeader ? gapH : 0) +
        (hasContent ? gapH : 0) +
        (hasFooter ? gapH : 0);

      const exactPartSize = Math.min(
        (exactWidth / sumPartsW) * 3,
        (exactHeight - sumGapH) / sumPartsH,
        maxPartSize,
      );
      return {
        basicFontSize: Math.floor(3 * exactPartSize),
        bodyContentFontSize: Math.floor(8 * exactPartSize),
      };
    };

  private getTextWidth = (
    context,
    text: string,
    fontWeight: string = DEFAULT_FONT_WEIGHT,
    fontSize: string = DEFAULT_FONT_SIZE,
    fontFamily: string = DEFAULT_FONT_FAMILY,
  ): number => {
    const canvas =
      this.utilCanvas ||
      (this.utilCanvas = context.document.createElement('canvas'));
    const measureLayer = canvas.getContext('2d');
    measureLayer.font = `${fontWeight} ${fontSize} ${fontFamily}`;
    const metrics = measureLayer.measureText(text);
    return Math.ceil(metrics.width);
  };

  private getBoardTypes = count => {
    if (count === 1) {
      return [this.boardTypes[1]];
    }
    return this.boardTypes;
  };
}

export default ScoreChart;
