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

import { DeleteOutlined } from '@ant-design/icons';
import { ChartDataSectionField } from 'app/pages/ChartWorkbenchPage/models/ChartConfig';
import { ChartDataViewFieldType } from 'app/pages/ChartWorkbenchPage/models/ChartDataView';
import { XYCoord } from 'dnd-core';
import { CHART_DRAG_ELEMENT_TYPE } from 'globalConstants';
import { forwardRef, useImperativeHandle, useRef } from 'react';
import {
  ConnectDragSource,
  ConnectDropTarget,
  DragSource,
  DragSourceConnector,
  DragSourceMonitor,
  DropTarget,
  DropTargetConnector,
  DropTargetMonitor,
} from 'react-dnd';
import styled from 'styled-components/macro';
import {
  BORDER_RADIUS,
  FONT_SIZE_SUBTITLE,
  SPACE,
  SPACE_MD,
  SPACE_XS,
} from 'styles/StyleConstants';

export interface ChartDraggableElementObject {
  id: string;
  index: number;
}

export interface ChartDraggableElementProps {
  id: any;
  content: string | Function;
  index: number;
  isDragging: boolean;
  config: ChartDataSectionField;
  connectDragSource: ConnectDragSource;
  connectDropTarget: ConnectDropTarget;
  moveCard: (dragIndex: number, hoverIndex: number) => void;
  onDelete: () => void;
}

interface ChartDraggableElementInstance {
  getNode(): HTMLDivElement | null;
}

const ChartDraggableElement = forwardRef<
  HTMLDivElement,
  ChartDraggableElementProps
>(function Card(
  {
    content,
    isDragging,
    config,
    connectDragSource,
    connectDropTarget,
    onDelete,
  },
  ref,
) {
  const elementRef = useRef(null);
  connectDragSource(elementRef);
  connectDropTarget(elementRef);

  useImperativeHandle<any, ChartDraggableElementInstance>(ref, () => ({
    getNode: () => elementRef.current,
  }));
  return (
    <StyledChartDraggableElement
      className="draggable-element"
      ref={elementRef}
      isDragging={isDragging}
      type={config.type}
    >
      {typeof content === 'string' ? (
        content
      ) : (
        <Content>
          <span className="title">{content()}</span>
          <DeleteOutlined className="action" onClick={onDelete} />
        </Content>
      )}
    </StyledChartDraggableElement>
  );
});

export default DropTarget(
  CHART_DRAG_ELEMENT_TYPE.DATA_CONFIG_COLUMN,
  {
    hover(
      props: ChartDraggableElementProps,
      monitor: DropTargetMonitor,
      component: ChartDraggableElementInstance,
    ) {
      if (!component) {
        return null;
      }
      // node = HTML Div element from imperative API
      const node = component.getNode();
      if (!node) {
        return null;
      }

      const dragIndex = monitor.getItem<ChartDraggableElementObject>().index;
      const hoverIndex = props.index;

      // Don't replace items with themselves
      if (dragIndex === hoverIndex) {
        return;
      }

      // Determine rectangle on screen
      const hoverBoundingRect = node.getBoundingClientRect();

      // Get vertical middle
      const hoverMiddleY =
        (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;

      // Determine mouse position
      const clientOffset = monitor.getClientOffset();

      // Get pixels to the top
      const hoverClientY = (clientOffset as XYCoord).y - hoverBoundingRect.top;

      // Only perform the move when the mouse has crossed half of the items height
      // When dragging downwards, only move when the cursor is below 50%
      // When dragging upwards, only move when the cursor is above 50%

      // Dragging downwards
      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
        return;
      }

      // Dragging upwards
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
        return;
      }

      // Time to actually perform the action
      props.moveCard(dragIndex, hoverIndex);

      // Note: we're mutating the monitor item here!
      // Generally it's better to avoid mutations,
      // but it's good here for the sake of performance
      // to avoid expensive index searches.
      monitor.getItem<ChartDraggableElementObject>().index = hoverIndex;
    },
  },
  (connect: DropTargetConnector) => ({
    connectDropTarget: connect.dropTarget(),
  }),
)(
  DragSource(
    CHART_DRAG_ELEMENT_TYPE.DATA_CONFIG_COLUMN,
    {
      beginDrag: (props: ChartDraggableElementProps) => ({
        id: props.id,
        index: props.index,
        ...props.config,
      }),
      endDrag: (props, monitor) => {
        const dropResult = monitor.getDropResult();
        if (!monitor.didDrop() && !dropResult) {
          props.onDelete && props.onDelete();
        } else if (monitor.didDrop() && !!dropResult?.delete) {
          props.onDelete && props.onDelete();
        }
      },
    },
    (connect: DragSourceConnector, monitor: DragSourceMonitor) => ({
      connectDragSource: connect.dragSource(),
      isDragging: monitor.isDragging(),
    }),
  )(ChartDraggableElement),
);

const StyledChartDraggableElement = styled.div<{
  isDragging;
  type: ChartDataViewFieldType;
}>`
  padding: ${SPACE_XS} ${SPACE_MD};
  margin-bottom: ${SPACE};
  font-size: ${FONT_SIZE_SUBTITLE};
  color: ${p => p.theme.componentBackground};
  cursor: move;
  background: ${p =>
    p.type === ChartDataViewFieldType.NUMERIC ? p.theme.success : p.theme.info};
  border-radius: ${BORDER_RADIUS};
  opacity: ${p => (p.isDragging ? 0 : 1)};
`;

const Content = styled.div`
  display: flex;
  align-items: center;

  .title {
    flex: 1;
  }

  .action {
    flex-shrink: 0;
    visibility: hidden;
  }

  &:hover {
    .action {
      visibility: visible;
    }
  }
`;
