/*
 * Datart
 * <p>
 * Copyright 2021
 * <p>
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * <p>
 * http://www.apache.org/licenses/LICENSE-2.0
 * <p>
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package datart.data.provider.util;

import datart.data.provider.base.DataProviderException;
import datart.data.provider.base.SqlExpression;
import datart.data.provider.base.SqlOperator;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;

public class SqlUtils {

    public static SqlExpression parseSQLExpression(String sqlExpression, String quote) {
        String arg = null;
        String val = null;
        List<SqlOperator> opTypes = new ArrayList<>();
        for (SqlOperator type : SqlOperator.values()) {
            Matcher matcher = type.getPattern().matcher(sqlExpression);
            if (matcher.find()) {
                if (matcher.groupCount() > 1) {
                    throw new DataProviderException("SQL Script parsing error. near to " + sqlExpression);
                }
                String[] split = type.getReplace().split(sqlExpression);
                if (split.length != 2) {
                    throw new DataProviderException("SQL Script parsing error. near to " + sqlExpression);
                }
                if (split[0].contains(quote)) {
                    val = split[0].trim();
                    arg = split[1].trim();
                } else {
                    val = split[1].trim();
                    arg = split[0].trim();
                }
                opTypes.add(type);
            }
        }
        if (opTypes.size() != 1) {
            throw new DataProviderException("SQL Script parsing error. near to " + sqlExpression);
        }
        return new SqlExpression(arg, val, opTypes.get(0));
    }
}