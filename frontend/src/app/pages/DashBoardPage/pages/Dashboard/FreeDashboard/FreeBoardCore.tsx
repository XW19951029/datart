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
import { WidgetAllProvider } from 'app/pages/DashBoardPage/components/WidgetAllProvider';
import { BoardConfigContext } from 'app/pages/DashBoardPage/contexts/BoardConfigContext';
import { BoardContext } from 'app/pages/DashBoardPage/contexts/BoardContext';
import useBoardWidthHeight from 'app/pages/DashBoardPage/hooks/useCreateWidget';
import { selectLayoutWidgetMapById } from 'app/pages/DashBoardPage/slice/selector';
import { BoardState } from 'app/pages/DashBoardPage/slice/types';
import React, { memo, useContext, useMemo } from 'react';
import { useSelector } from 'react-redux';
import styled from 'styled-components/macro';
import SlideBackground from '../../../components/FreeBoardBackground';
import useClientRect from '../../../hooks/useClientRect';
import useSlideStyle from '../../../hooks/useSlideStyle';
import { WidgetOfFree } from './WidgetOfFree';
import ZoomControl from './ZoomControl';

export interface FreeBoardCoreProps {
  boardId: string;
  showZoomCtrl?: boolean;
}
const FreeBoardCore: React.FC<FreeBoardCoreProps> = memo(
  ({ boardId, showZoomCtrl }) => {
    const { config } = useContext(BoardConfigContext);
    const { editing, autoFit } = useContext(BoardContext);
    const { width: slideWidth, height: slideHeight, scaleMode } = config;
    const widgetConfigRecords = useSelector((state: { board: BoardState }) =>
      selectLayoutWidgetMapById()(state, boardId),
    );
    const widgetConfigs = useMemo(() => {
      return Object.values(widgetConfigRecords).sort((w1, w2) => {
        return w2.config.index - w1.config.index;
      });
    }, [widgetConfigRecords]);

    const [rect, refGridBackground] = useClientRect<HTMLDivElement>();
    const {
      zoomIn,
      zoomOut,
      sliderChange,
      sliderValue,
      scale,
      nextBackgroundStyle,
      slideTranslate,
    } = useSlideStyle(
      autoFit,
      editing,
      rect,
      slideWidth,
      slideHeight,
      scaleMode,
    );
    const boardChildren = useMemo(() => {
      return widgetConfigs
        .sort((a, b) => a.config.index - b.config.index)
        .map(item => {
          return (
            <WidgetAllProvider id={item.id}>
              <WidgetOfFree />
            </WidgetAllProvider>
          );
        });
    }, [widgetConfigs]);
    const { gridRef } = useBoardWidthHeight();
    return (
      <Wrap>
        <div className="container" ref={gridRef}>
          <div
            className="grid-background"
            style={nextBackgroundStyle}
            ref={refGridBackground}
          >
            <SlideBackground scale={scale} slideTranslate={slideTranslate}>
              {boardChildren}
            </SlideBackground>
          </div>
          {showZoomCtrl && (
            <ZoomControl
              sliderValue={sliderValue}
              scale={scale}
              zoomIn={zoomIn}
              zoomOut={zoomOut}
              sliderChange={sliderChange}
            />
          )}
        </div>
      </Wrap>
    );
  },
);
export default FreeBoardCore;
const Wrap = styled.div`
  display: flex;
  flex: 1;
  overflow-y: hidden;
  .container {
    display: flex;
    flex: 1;
    flex-direction: column;
    overflow-y: hidden;
    .grid-background {
      flex: 1;
      -ms-overflow-style: none;
      overflow-y: hidden;
    }
    .grid-background::-webkit-scrollbar {
      width: 0 !important;
    }
  }
  .container::-webkit-scrollbar {
    width: 0 !important;
  }
  &::-webkit-scrollbar {
    width: 0 !important;
  }
`;
