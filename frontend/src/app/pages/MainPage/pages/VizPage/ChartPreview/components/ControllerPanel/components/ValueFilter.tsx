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

import SingleFilterRow from 'app/pages/ChartWorkbenchPage/components/ChartOperationPanel/components/ChartFieldAction/FilterAction/SingleFilterRow';
import { ConditionBuilder } from 'app/pages/ChartWorkbenchPage/models/ChartFilterCondition';
import { FC, memo } from 'react';
import { PresentControllerFilterProps } from '.';

const ValueFilter: FC<PresentControllerFilterProps> = memo(
  ({ condition, onConditionChange }) => {
    return (
      <SingleFilterRow
        rowName={'root'}
        condition={new ConditionBuilder(condition).asSelf()}
        onConditionChange={onConditionChange}
      />
    );
  },
);

export default ValueFilter;
