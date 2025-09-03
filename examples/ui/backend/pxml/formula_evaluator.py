"""
Formula Evaluator for Excel-style Functions

Converts Excel formulas to JavaScript expressions and provides evaluation utilities.
"""

import re
from typing import Dict, List, Any, Optional


class FormulaEvaluator:
    """Converts Excel formulas to JavaScript expressions"""

    def __init__(self):
        # Mapping of Excel functions to JavaScript equivalents
        self.excel_to_js_functions = {
            "SUM": "arraySum",
            "AVG": "arrayAvg",
            "AVERAGE": "arrayAvg",
            "COUNT": "arrayCount",
            "COUNTA": "arrayCountA",
            "MAX": "arrayMax",
            "MIN": "arrayMin",
            "SUMIF": "arraySumIf",
            "COUNTIF": "arrayCountIf",
            "COUNTIFS": "arrayCountIfs",
            "UNIQUE": "arrayUnique",
            "IF": "excelIf",
            "AND": "excelAnd",
            "OR": "excelOr",
            "ROUND": "Math.round",
            "ABS": "Math.abs",
            "MONTH": "getMonth",
            "TODAY": "excelToday",
            "INDEX": "arrayIndex",
            "MATCH": "arrayMatch",
            "TIME": "excelTime",
            "RIGHT": "excelRight",
            "MID": "excelMid",
            "LEFT": "excelLeft",
            "VALUE": "parseFloat",
            "ISNUMBER": "excelIsNumber",
            "SEARCH": "excelSearch",
            "HOUR": "excelHour",
            "TIMEVALUE": "excelTimeValue",
            "INT": "Math.floor",
            "YEAR": "arrayMapYear",
            "TEXT": "excelText",
        }

    def convert_formula_to_js(
        self, formula: str, column_mapping: Dict[str, str]
    ) -> str:
        """Convert Excel formula to JavaScript expression"""
        if not formula.startswith("="):
            return f'"{formula}"'  # Return as string literal if not a formula

        # Remove the leading '='
        js_expression = formula[1:]

        # Handle special patterns first
        js_expression = self._handle_special_patterns(js_expression, column_mapping)

        # Replace column references (A:A, B2:B, etc.) with data access
        js_expression = self._replace_column_references(js_expression, column_mapping)

        # Replace Excel functions with JavaScript equivalents
        js_expression = self._replace_excel_functions(js_expression)

        # Handle Excel-style operators
        js_expression = self._replace_excel_operators(js_expression)

        return js_expression

    def _handle_special_patterns(
        self, expression: str, column_mapping: Dict[str, str]
    ) -> str:
        """Handle special formula patterns that need custom JavaScript conversion"""
        import re

        # Pattern for percentage growth: AVERAGE(((O2:O-P2:P)/P2:P)*100)
        growth_pattern = r"AVERAGE\(\(\(([A-Z]+\d*:\d*[A-Z]*)-([A-Z]+\d*:\d*[A-Z]*)\)/([A-Z]+\d*:\d*[A-Z]*)\)\*100\)"

        match = re.search(growth_pattern, expression)
        if match:
            col1_ref = match.group(1)  # O2:O (current values)
            col2_ref = match.group(2)  # P2:P (previous values)
            col3_ref = match.group(3)  # P2:P (denominator, should be same as col2)

            # Extract column letters
            col1_letter = re.search(r"([A-Z]+)", col1_ref).group(1)
            col2_letter = re.search(r"([A-Z]+)", col2_ref).group(1)

            if col1_letter in column_mapping and col2_letter in column_mapping:
                col1_name = column_mapping[col1_letter]
                col2_name = column_mapping[col2_letter]

                # Replace with specialized function
                replacement = f'arrayAvg(arrayPercentageGrowth(getColumnData("{col1_name}", 2), getColumnData("{col2_name}", 2)))'
                expression = re.sub(growth_pattern, replacement, expression)

        return expression

    def _replace_column_references(
        self, expression: str, column_mapping: Dict[str, str]
    ) -> str:
        """Replace Excel column references with JavaScript data access"""

        # Pattern for custom column name ranges like survival_rate2:survival_rate, plant_type2:plant_type
        # Exclude single letters (those are handled by the letter range pattern)
        custom_range_pattern = (
            r"([a-zA-Z_][a-zA-Z0-9_]{1,})(\d*):([a-zA-Z_][a-zA-Z0-9_]{1,})"
        )

        def replace_custom_range(match):
            start_name = match.group(1)
            start_row = match.group(2)
            end_name = match.group(3)

            # If start and end names are similar (like survival_rate2:survival_rate), use the base name
            if start_name.startswith(end_name) or end_name.startswith(start_name):
                base_name = end_name if len(end_name) <= len(start_name) else start_name
                return f'getColumnData("{base_name}")'
            # If they're the same name
            elif start_name == end_name:
                return f'getColumnData("{start_name}")'

            return match.group(0)  # Return original if we can't handle it

        expression = re.sub(custom_range_pattern, replace_custom_range, expression)

        # Pattern for column ranges like A2:A, B:B, C2:C100
        range_pattern = r"([A-Z]+)(\d*):([A-Z]+)(\d*)"

        def replace_range(match):
            start_col = match.group(1)
            start_row = match.group(2)
            end_col = match.group(3)
            end_row = match.group(4)

            # For now, we'll assume single column ranges (A:A, B2:B)
            if start_col == end_col:
                column_name = column_mapping.get(start_col, start_col)
                if start_row and start_row != "1":
                    # Range starting from specific row
                    return f'getColumnData("{column_name}", {start_row})'
                else:
                    # Entire column (excluding header)
                    return f'getColumnData("{column_name}")'

            return match.group(0)  # Return original if we can't handle it

        expression = re.sub(range_pattern, replace_range, expression)

        # Pattern for single cell references like A1, B5
        cell_pattern = r"([A-Z]+)(\d+)"

        def replace_cell(match):
            col = match.group(1)
            row = int(match.group(2))
            column_name = column_mapping.get(col, col)
            # Convert to 0-based index for JavaScript
            return f'getCellValue("{column_name}", {row - 1})'

        expression = re.sub(cell_pattern, replace_cell, expression)

        # Handle direct column name references (like "crime_category", "year_period")
        # This is for user-defined columns that might be referenced by name
        reverse_mapping = {v: k for k, v in column_mapping.items()}

        # Pattern for direct column names in function calls like COUNTIF(crime_category, "value")
        # Look for column names that appear as standalone words (not already inside getColumnData calls)
        for column_name, letter in reverse_mapping.items():
            # Only replace if it's a standalone word AND not already inside a getColumnData call
            # Use negative lookbehind to avoid replacing inside existing getColumnData calls
            column_pattern = (
                r"(?<!getColumnData\(\")\b" + re.escape(column_name) + r"\b(?!\"\))"
            )
            expression = re.sub(
                column_pattern, f'getColumnData("{column_name}")', expression
            )

        return expression

    def _replace_excel_functions(self, expression: str) -> str:
        """Replace Excel functions with JavaScript equivalents"""

        for excel_func, js_func in self.excel_to_js_functions.items():
            # Pattern to match function calls
            pattern = rf"\b{excel_func}\s*\("
            replacement = f"{js_func}("
            expression = re.sub(pattern, replacement, expression, flags=re.IGNORECASE)

        return expression

    def _replace_excel_operators(self, expression: str) -> str:
        """Replace Excel-specific operators"""
        # Excel uses <> for not equal, JavaScript uses !=
        expression = expression.replace("<>", "!=")

        # Excel uses = for comparison inside functions, JavaScript uses ==
        # Handle patterns like "column=value" or "function()=value" within function calls
        # This matches = that are not at the start of the expression (which would be formula assignment)
        import re

        # First, handle array comparisons with data access functions
        data_comparison_pattern = r"(getColumnData\([^)]+\))\s*=\s*(\d+)"

        def replace_data_comparison(match):
            array_expr = match.group(1)
            compare_value = match.group(2)
            return f"{array_expr}.map(val => val == {compare_value})"

        expression = re.sub(
            data_comparison_pattern, replace_data_comparison, expression
        )

        # Then replace remaining = with == when used for comparison (not assignment)
        # But skip anything that's already inside a map() function with arrow syntax
        # Use negative lookbehind and lookahead to avoid arrow function syntax
        if ".map(val => val ==" not in expression:
            # Look for patterns like: identifier=value, function()=value, array=value
            comparison_pattern = r"(\w+(?:\([^)]*\))?)\s*=\s*([^,)]+)"

            def replace_comparison(match):
                left_side = match.group(1)
                right_side = match.group(2)
                # Skip if it's part of our array mapping
                if ".map(" in expression and "val" in right_side:
                    return match.group(0)
                return f"{left_side} == {right_side}"

            expression = re.sub(comparison_pattern, replace_comparison, expression)

        # Excel uses & for string concatenation, JavaScript uses +
        # Note: This is simplified and may need more sophisticated handling
        expression = re.sub(
            r'(\w+|\)|"[^"]*")\s*&\s*(\w+|\(|"[^"]*")', r"\1 + \2", expression
        )

        return expression

    def generate_js_helper_functions(self) -> str:
        """Generate JavaScript helper functions for Excel-style operations"""
        return """
// Excel-style helper functions for dashboard formulas
const ExcelHelpers = {
    // Array manipulation functions
    arraySum: function(arr) {
        if (!Array.isArray(arr)) return 0;
        return arr.filter(x => !isNaN(x) && x !== null && x !== '').reduce((sum, val) => sum + Number(val), 0);
    },
    
    arrayAvg: function(arr) {
        if (!Array.isArray(arr)) return 0;
        const numbers = arr.filter(x => !isNaN(x) && x !== null && x !== '');
        return numbers.length > 0 ? this.arraySum(numbers) / numbers.length : 0;
    },
    
    arrayCount: function(arr) {
        if (!Array.isArray(arr)) return 0;
        return arr.filter(x => !isNaN(x) && x !== null && x !== '').length;
    },
    
    arrayCountA: function(arr) {
        if (!Array.isArray(arr)) return 0;
        return arr.filter(x => x !== null && x !== '' && x !== undefined).length;
    },
    
    arrayMax: function(arr) {
        if (!Array.isArray(arr)) return 0;
        const numbers = arr.filter(x => !isNaN(x) && x !== null && x !== '').map(Number);
        return numbers.length > 0 ? Math.max(...numbers) : 0;
    },
    
    arrayMin: function(arr) {
        if (!Array.isArray(arr)) return 0;
        const numbers = arr.filter(x => !isNaN(x) && x !== null && x !== '').map(Number);
        return numbers.length > 0 ? Math.min(...numbers) : 0;
    },
    
    arrayUnique: function(arr) {
        if (!Array.isArray(arr)) return [];
        return [...new Set(arr.filter(x => x !== null && x !== '' && x !== undefined))];
    },
    
    arrayMapYear: function(arr) {
        if (!Array.isArray(arr)) {
            // If it's a single value, apply getYear to it
            return ExcelHelpers.getYear(arr);
        }
        // Apply getYear to each element in the array
        return arr.map(dateStr => ExcelHelpers.getYear(dateStr)).filter(year => year > 0);
    },
    
    // Helper function for element-wise array operations
    arrayElementWiseOperation: function(arr1, arr2, operation, scalar = null) {
        if (!Array.isArray(arr1) || !Array.isArray(arr2)) return [];
        
        const result = [];
        const minLength = Math.min(arr1.length, arr2.length);
        
        for (let i = 0; i < minLength; i++) {
            const val1 = Number(arr1[i]) || 0;
            const val2 = Number(arr2[i]) || 0;
            
            let elementResult;
            switch (operation) {
                case 'subtract':
                    elementResult = val1 - val2;
                    break;
                case 'divide':
                    elementResult = val2 !== 0 ? val1 / val2 : 0;
                    break;
                case 'multiply':
                    elementResult = val1 * val2;
                    break;
                case 'add':
                    elementResult = val1 + val2;
                    break;
                default:
                    elementResult = val1;
            }
            
            if (scalar !== null) {
                elementResult *= scalar;
            }
            
            result.push(elementResult);
        }
        
        return result;
    },
    
    // Helper function for percentage growth calculation: ((current - previous) / previous) * 100
    arrayPercentageGrowth: function(currentValues, previousValues) {
        if (!Array.isArray(currentValues) || !Array.isArray(previousValues)) return [];
        
        const result = [];
        const minLength = Math.min(currentValues.length, previousValues.length);
        
        for (let i = 0; i < minLength; i++) {
            const current = Number(currentValues[i]) || 0;
            const previous = Number(previousValues[i]) || 0;
            
            if (previous !== 0) {
                const growth = ((current - previous) / previous) * 100;
                result.push(growth);
            } else {
                // If previous value is 0, treat as no growth data available
                result.push(0);
            }
        }
        
        return result;
    },
    
    arraySumIf: function(range, criteria, sumRange) {
        if (!Array.isArray(range)) return 0;
        
        // Handle case where sumRange is a literal value (like 1)
        let sumArray;
        if (Array.isArray(sumRange)) {
            sumArray = sumRange;
        } else {
            // Create array of the literal value with same length as range
            sumArray = new Array(range.length).fill(sumRange);
        }
        
        let sum = 0;
        for (let i = 0; i < Math.min(range.length, sumArray.length); i++) {
            if (this.meetsCriteria(range[i], criteria)) {
                sum += Number(sumArray[i]) || 0;
            }
        }
        return sum;
    },
    
    arrayCountIf: function(range, criteria) {
        if (!Array.isArray(range)) return 0;
        return range.filter(val => this.meetsCriteria(val, criteria)).length;
    },
    
    arrayCountIfs: function(range1, criteria1, range2, criteria2) {
        if (!Array.isArray(range1) || !Array.isArray(range2)) return 0;
        let count = 0;
        for (let i = 0; i < Math.min(range1.length, range2.length); i++) {
            if (this.meetsCriteria(range1[i], criteria1) && this.meetsCriteria(range2[i], criteria2)) {
                count++;
            }
        }
        return count;
    },
    
    arrayIndex: function(array, rowNum, colNum) {
        if (!Array.isArray(array)) return null;
        const index = (rowNum || 1) - 1; // Convert to 0-based
        return array[index] || null;
    },
    
    arrayMatch: function(lookupValue, lookupArray, matchType) {
        if (!Array.isArray(lookupArray)) return null;
        const index = lookupArray.indexOf(lookupValue);
        return index >= 0 ? index + 1 : null; // Return 1-based index
    },
    
    // Excel logical functions
    excelIf: function(condition, trueValue, falseValue) {
        // If condition is an array, apply IF to each element
        if (Array.isArray(condition)) {
            return condition.map(cond => cond ? trueValue : falseValue);
        }
        return condition ? trueValue : falseValue;
    },
    
    excelAnd: function(...conditions) {
        return conditions.every(c => Boolean(c));
    },
    
    excelOr: function(...conditions) {
        return conditions.some(c => Boolean(c));
    },
    
    // Date functions
    excelToday: function() {
        // Return today's date as a string in YYYY-MM-DD format
        const today = new Date();
        return today.getFullYear() + '-' + 
               String(today.getMonth() + 1).padStart(2, '0') + '-' + 
               String(today.getDate()).padStart(2, '0');
    },
    
    getMonth: function(dateStr) {
        try {
            const str = String(dateStr).trim();
            
            // Try direct Date parsing first
            let date = new Date(str);
            if (!isNaN(date.getTime())) {
                return date.getMonth() + 1; // 1-based month
            }
            
            // Try parsing different formats manually
            if (str.includes('/')) {
                const parts = str.split('/');
                if (parts.length === 3) {
                    // Try MM/DD/YYYY first
                    date = new Date(parts[2], parts[0] - 1, parts[1]);
                    if (!isNaN(date.getTime())) {
                        return date.getMonth() + 1;
                    }
                    // Try DD/MM/YYYY
                    date = new Date(parts[2], parts[1] - 1, parts[0]);
                    if (!isNaN(date.getTime())) {
                        return date.getMonth() + 1;
                    }
                }
            }
            
            // Try parsing with dots (DD.MM.YYYY or MM.DD.YYYY)
            if (str.includes('.')) {
                const parts = str.split('.');
                if (parts.length === 3) {
                    date = new Date(parts[2], parts[1] - 1, parts[0]); // DD.MM.YYYY
                    if (!isNaN(date.getTime())) {
                        return date.getMonth() + 1;
                    }
                    date = new Date(parts[2], parts[0] - 1, parts[1]); // MM.DD.YYYY
                    if (!isNaN(date.getTime())) {
                        return date.getMonth() + 1;
                    }
                }
            }
            
            return 0;
        } catch (error) {
            return 0;
        }
    },
    
    getYear: function(dateStr) {
        try {
            const str = String(dateStr).trim();
            
            // Try direct Date parsing first
            let date = new Date(str);
            if (!isNaN(date.getTime())) {
                return date.getFullYear();
            }
            
            // Try parsing different formats manually
            if (str.includes('/')) {
                const parts = str.split('/');
                if (parts.length === 3) {
                    // Try MM/DD/YYYY first
                    date = new Date(parts[2], parts[0] - 1, parts[1]);
                    if (!isNaN(date.getTime())) {
                        return date.getFullYear();
                    }
                    // Try DD/MM/YYYY
                    date = new Date(parts[2], parts[1] - 1, parts[0]);
                    if (!isNaN(date.getTime())) {
                        return date.getFullYear();
                    }
                }
            }
            
            // Try parsing with dots (DD.MM.YYYY or MM.DD.YYYY)
            if (str.includes('.')) {
                const parts = str.split('.');
                if (parts.length === 3) {
                    date = new Date(parts[2], parts[1] - 1, parts[0]); // DD.MM.YYYY
                    if (!isNaN(date.getTime())) {
                        return date.getFullYear();
                    }
                    date = new Date(parts[2], parts[0] - 1, parts[1]); // MM.DD.YYYY
                    if (!isNaN(date.getTime())) {
                        return date.getFullYear();
                    }
                }
            }
            
            // Extract year using regex as fallback
            const yearMatch = str.match(/\b(19|20)\d{2}\b/);
            if (yearMatch) {
                return parseInt(yearMatch[0]);
            }
            
            return 0;
        } catch (error) {
            return 0;
        }
    },
    
    // Excel time and text functions
    excelTime: function(hour, minute, second) {
        // Convert time to decimal hours (Excel TIME function returns fraction of day, we want hours)
        return (hour + minute/60 + (second || 0)/3600);
    },
    
    excelRight: function(text, numChars) {
        const str = String(text);
        return str.slice(-numChars);
    },
    
    excelMid: function(text, startNum, numChars) {
        const str = String(text);
        return str.slice(startNum - 1, startNum - 1 + numChars);
    },
    
    excelLeft: function(text, numChars) {
        const str = String(text);
        return str.slice(0, numChars);
    },
    
    // Excel text and logic functions
    excelIsNumber: function(value) {
        return !isNaN(value) && !isNaN(parseFloat(value));
    },
    
    excelSearch: function(findText, withinText, startNum = 1) {
        const str = String(withinText);
        const find = String(findText);
        const index = str.toLowerCase().indexOf(find.toLowerCase(), startNum - 1);
        return index >= 0 ? index + 1 : -1; // Return 1-based index, or -1 if not found
    },
    
    excelTimeValue: function(timeText) {
        try {
            const timeStr = String(timeText).trim();
            
            // Handle HH:MM or HH:MM:SS format
            if (timeStr.includes(':')) {
                const parts = timeStr.split(':');
                if (parts.length >= 2) {
                    const hour = parseInt(parts[0]) || 0;
                    const minute = parseInt(parts[1]) || 0;
                    const second = parseInt(parts[2]) || 0;
                    
                    // Return as decimal hours for compatibility
                    return hour + minute/60 + second/3600;
                }
            }
            
            return 0;
        } catch (error) {
            return 0;
        }
    },
    
    excelHour: function(timeValue) {
        try {
            // If it's a number (decimal hours), extract the integer part
            if (typeof timeValue === 'number') {
                return Math.floor(timeValue);
            }
            
            // If it's an array, apply to each element
            if (Array.isArray(timeValue)) {
                return timeValue.map(val => this.excelHour(val));
            }
            
            // Handle ISO date strings like "2024-06-01T00:00:00Z"
            const timeStr = String(timeValue).trim();
            if (timeStr.includes('T') && timeStr.includes(':')) {
                // ISO format - extract time part and get hour
                const timePart = timeStr.split('T')[1];
                if (timePart) {
                    const hour = parseInt(timePart.split(':')[0]) || 0;
                    return hour;
                }
            } else if (timeStr.includes(':')) {
                // Time string format HH:MM or HH:MM:SS
                const hour = parseInt(timeStr.split(':')[0]) || 0;
                return hour;
            } else {
                // Try parsing as Date object
                const date = new Date(timeStr);
                if (!isNaN(date.getTime())) {
                    return date.getHours();
                }
            }
            
            return 0;
        } catch (error) {
            return 0;
        }
    },
    
    // Excel TEXT function for formatting dates/numbers with comprehensive format support
    excelText: function(value, formatCode) {
        try {
            const str = String(value).trim();
            const format = String(formatCode).trim().replace(/"/g, '').toLowerCase();
            
            // Try to parse as date first (support multiple input formats)
            let date = new Date(str);
            
            // If initial parse fails, try other common date formats
            if (isNaN(date.getTime()) && str.includes('/')) {
                // Try MM/DD/YYYY or DD/MM/YYYY
                const parts = str.split('/');
                if (parts.length === 3) {
                    // Try MM/DD/YYYY first, then DD/MM/YYYY
                    date = new Date(parts[2], parts[0] - 1, parts[1]);
                    if (isNaN(date.getTime())) {
                        date = new Date(parts[2], parts[1] - 1, parts[0]);
                    }
                }
            }
            
            if (!isNaN(date.getTime())) {
                // Date formatting patterns
                const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                               'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                const fullMonths = ['January', 'February', 'March', 'April', 'May', 'June',
                                   'July', 'August', 'September', 'October', 'November', 'December'];
                
                switch (format) {
                    case 'mmm yyyy':
                    case 'mmm-yyyy':
                        return months[date.getMonth()] + ' ' + date.getFullYear();
                        
                    case 'mmmm yyyy':
                    case 'mmmm-yyyy':
                        return fullMonths[date.getMonth()] + ' ' + date.getFullYear();
                        
                    case 'mm/yyyy':
                    case 'mm-yyyy':
                        return String(date.getMonth() + 1).padStart(2, '0') + '/' + date.getFullYear();
                        
                    case 'yyyy-mm':
                    case 'yyyy/mm':
                        return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0');
                        
                    case 'yyyy-mm-dd':
                        return date.getFullYear() + '-' + 
                               String(date.getMonth() + 1).padStart(2, '0') + '-' + 
                               String(date.getDate()).padStart(2, '0');
                        
                    case 'mm/dd/yyyy':
                        return String(date.getMonth() + 1).padStart(2, '0') + '/' + 
                               String(date.getDate()).padStart(2, '0') + '/' + 
                               date.getFullYear();
                        
                    case 'dd/mm/yyyy':
                        return String(date.getDate()).padStart(2, '0') + '/' + 
                               String(date.getMonth() + 1).padStart(2, '0') + '/' + 
                               date.getFullYear();
                        
                    case 'mmm':
                    case 'mon':
                        return months[date.getMonth()];
                        
                    case 'mmmm':
                    case 'month':
                        return fullMonths[date.getMonth()];
                        
                    case 'yyyy':
                    case 'year':
                        return String(date.getFullYear());
                        
                    case 'mm':
                    case 'month_num':
                        return String(date.getMonth() + 1).padStart(2, '0');
                        
                    case 'dd':
                    case 'day':
                        return String(date.getDate()).padStart(2, '0');
                }
            }
            
            // Try to parse as number for numeric formatting
            const numValue = Number(str);
            if (!isNaN(numValue) && isFinite(numValue)) {
                switch (format) {
                    case '0':
                    case '#':
                        return String(Math.round(numValue));
                        
                    case '0.0':
                    case '#.#':
                        return numValue.toFixed(1);
                        
                    case '0.00':
                    case '#.##':
                        return numValue.toFixed(2);
                        
                    case '0%':
                    case '#%':
                        return Math.round(numValue * 100) + '%';
                        
                    case '0.0%':
                    case '#.#%':
                        return (numValue * 100).toFixed(1) + '%';
                        
                    case '0.00%':
                    case '#.##%':
                        return (numValue * 100).toFixed(2) + '%';
                        
                    case '$0':
                    case '$#':
                        return '$' + Math.round(numValue);
                        
                    case '$0.00':
                    case '$#.##':
                        return '$' + numValue.toFixed(2);
                        
                    default:
                        // Handle comma-separated numbers
                        if (/^[#0,]+$/.test(format)) {
                            return numValue.toLocaleString('en-US', { maximumFractionDigits: 0 });
                        } else if (/^[#0,]+\.[#0]+$/.test(format)) {
                            const decimalPlaces = format.split('.')[1].length;
                            return numValue.toLocaleString('en-US', { 
                                minimumFractionDigits: decimalPlaces,
                                maximumFractionDigits: decimalPlaces 
                            });
                        }
                }
            }
            
            // For unhandled formats or invalid data, return the original value as string
            return str;
            
        } catch (error) {
            return String(value);
        }
    },
    
    // Helper function for criteria matching
    meetsCriteria: function(value, criteria) {
        // Handle boolean/string comparison for true/false values
        if (typeof value === 'boolean' && typeof criteria === 'string') {
            if (criteria === 'true') return value === true;
            if (criteria === 'false') return value === false;
        }
        
        if (typeof criteria === 'string') {
            // Handle string patterns like ">100", "=text", etc.
            const match = criteria.match(/^([><=!]+)(.*)$/);
            if (match) {
                const operator = match[1];
                const compareValue = isNaN(match[2]) ? match[2] : Number(match[2]);
                const numValue = isNaN(value) ? value : Number(value);
                
                switch (operator) {
                    case '>': return numValue > compareValue;
                    case '>=': return numValue >= compareValue;
                    case '<': return numValue < compareValue;
                    case '<=': return numValue <= compareValue;
                    case '=': return value == compareValue;
                    case '!=': return value != compareValue;
                    default: return value == criteria;
                }
            }
        }
        return value == criteria;
    }
};

// Data access functions
function getColumnData(columnName, startRow = 1) {
    if (!window.dashboardData || !Array.isArray(window.dashboardData)) return [];
    
    const filtered = getFilteredData();
    
    // Since window.dashboardData is already processed JSON data without headers,
    // we always return all filtered data regardless of startRow
    return filtered.map(row => row[columnName]).filter(val => val !== undefined);
}

function getCellValue(columnName, rowIndex) {
    if (!window.dashboardData || !Array.isArray(window.dashboardData)) return null;
    
    const filtered = getFilteredData();
    if (rowIndex >= 0 && rowIndex < filtered.length) {
        return filtered[rowIndex][columnName];
    }
    return null;
}

function getFilteredData() {
    if (!window.dashboardData) return [];
    if (!window.currentFilters || Object.keys(window.currentFilters).length === 0) {
        return window.dashboardData;
    }
    
    return window.dashboardData.filter(row => {
        for (const [filterName, filterValue] of Object.entries(window.currentFilters)) {
            if (!filterValue || filterValue === '' || 
                (Array.isArray(filterValue) && filterValue.length === 0)) continue;
            
            // Map filter name to actual column name in data
            const filterMapping = window.filterToColumnMap[filterName] || filterName;
            let rowValue;
            
            if (typeof filterMapping === 'object' && filterMapping.column && filterMapping.transform) {
                // This is a computed filter - apply the transformation
                const baseValue = row[filterMapping.column];
                if (filterMapping.transform === 'YEAR') {
                    rowValue = ExcelHelpers.getYear(baseValue);
                } else {
                    rowValue = baseValue;
                }
            } else {
                // Direct column mapping
                const columnName = filterMapping;
                rowValue = row[columnName];
            }
            
            if (Array.isArray(filterValue)) {
                // Handle boolean/string comparison in filters
                let matchFound = false;
                for (let filterItem of filterValue) {
                    if (typeof rowValue === 'boolean' && typeof filterItem === 'string') {
                        if ((filterItem === 'true' && rowValue === true) || 
                            (filterItem === 'false' && rowValue === false)) {
                            matchFound = true;
                            break;
                        }
                    } else if (filterItem == rowValue) {
                        matchFound = true;
                        break;
                    }
                }
                if (!matchFound) return false;
            } else if (typeof filterValue === 'object' && (filterValue.start !== undefined || filterValue.end !== undefined)) {
                // Handle date range filters
                const rowDate = rowValue; // Date string in YYYY-MM-DD format
                if (filterValue.start && rowDate < filterValue.start) return false;
                if (filterValue.end && rowDate > filterValue.end) return false;
            } else if (typeof filterValue === 'object' && (filterValue.min !== undefined || filterValue.max !== undefined)) {
                // Handle numeric range filters
                const numValue = Number(rowValue);
                if (filterValue.min !== undefined && numValue < filterValue.min) return false;
                if (filterValue.max !== undefined && numValue > filterValue.max) return false;
            } else {
                if (rowValue != filterValue) return false;
            }
        }
        return true;
    });
}

// Make functions available globally
Object.assign(window, ExcelHelpers);
"""

    def get_filter_values_js(self, formula: str, column_mapping: Dict[str, str]) -> str:
        """Convert filter values formula to JavaScript"""
        js_expression = self.convert_formula_to_js(formula, column_mapping)

        # Wrap in a function that returns the values
        return f"(function() {{ return {js_expression}; }})()"
