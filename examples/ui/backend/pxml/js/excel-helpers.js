/**
 * Excel Helper Functions Module
 * Provides Excel-compatible functions for formula evaluation
 */

const ExcelHelpers = {
    // Math and statistical functions
    excelSum: function(range) {
        if (!Array.isArray(range)) return 0;
        return range.filter(x => !isNaN(x) && x !== null && x !== '').reduce((sum, val) => sum + Number(val), 0);
    },
    
    excelAvg: function(range) {
        if (!Array.isArray(range)) return 0;
        const numbers = range.filter(x => !isNaN(x) && x !== null && x !== '');
        return numbers.length > 0 ? this.excelSum(numbers) / numbers.length : 0;
    },
    
    excelCount: function(range) {
        if (!Array.isArray(range)) return 0;
        return range.filter(x => !isNaN(x) && x !== null && x !== '').length;
    },
    
    excelCountA: function(range) {
        if (!Array.isArray(range)) return 0;
        return range.filter(x => x !== null && x !== '' && x !== undefined).length;
    },
    
    excelMax: function(range) {
        if (!Array.isArray(range)) return 0;
        const numbers = range.filter(x => !isNaN(x) && x !== null && x !== '').map(Number);
        return numbers.length > 0 ? Math.max(...numbers) : 0;
    },
    
    excelMin: function(range) {
        if (!Array.isArray(range)) return 0;
        const numbers = range.filter(x => !isNaN(x) && x !== null && x !== '').map(Number);
        return numbers.length > 0 ? Math.min(...numbers) : 0;
    },

    // Array functions (used internally by formulas)
    arraySum: function(arr) {
        if (!Array.isArray(arr)) return 0;
        return arr.filter(x => !isNaN(x) && x !== null && x !== '').reduce((sum, val) => sum + Number(val), 0);
    },
    
    arrayAvg: function(arr) {
        if (!Array.isArray(arr)) return 0;
        const numbers = arr.filter(x => !isNaN(x) && x !== null && x !== '');
        return numbers.length > 0 ? arraySum(numbers) / numbers.length : 0;
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

    // Conditional functions
    arraySumIf: function(range, criteria, sumRange) {
        if (!Array.isArray(range)) return 0;
        
        // If sumRange is not provided, sum the range itself
        let sumArray = sumRange ? (Array.isArray(sumRange) ? sumRange : [sumRange]) : range;
        
        // If sumRange is a single value, create array of that value
        if (!Array.isArray(sumArray)) {
            // Create array of the literal value with same length as range
            sumArray = new Array(range.length).fill(sumRange);
        }
        
        let sum = 0;
        for (let i = 0; i < Math.min(range.length, sumArray.length); i++) {
            if (ExcelHelpers.meetsCriteria(range[i], criteria)) {
                sum += Number(sumArray[i]) || 0;
            }
        }
        return sum;
    },
    
    arrayCountIf: function(range, criteria) {
        if (!Array.isArray(range)) return 0;
        return range.filter(val => ExcelHelpers.meetsCriteria(val, criteria)).length;
    },
    
    arrayCountIfs: function(range1, criteria1, range2, criteria2) {
        if (!Array.isArray(range1) || !Array.isArray(range2)) return 0;
        let count = 0;
        for (let i = 0; i < Math.min(range1.length, range2.length); i++) {
            if (ExcelHelpers.meetsCriteria(range1[i], criteria1) && ExcelHelpers.meetsCriteria(range2[i], criteria2)) {
                count++;
            }
        }
        return count;
    },
    
    arrayIndex: function(array, rowNum, colNum) {
        if (!Array.isArray(array)) return null;
        
        // For 1D arrays, just return the element at rowNum-1 (Excel is 1-indexed)
        if (typeof array[0] !== 'object') {
            const index = (rowNum || 1) - 1;
            return index >= 0 && index < array.length ? array[index] : null;
        }
        
        // For 2D arrays (array of objects or arrays)
        const row = (rowNum || 1) - 1;
        if (row >= 0 && row < array.length) {
            if (colNum) {
                const col = colNum - 1;
                if (Array.isArray(array[row])) {
                    return col >= 0 && col < array[row].length ? array[row][col] : null;
                } else if (typeof array[row] === 'object') {
                    const keys = Object.keys(array[row]);
                    return col >= 0 && col < keys.length ? array[row][keys[col]] : null;
                }
            }
            return array[row];
        }
        return null;
    },

    // Date and time functions
    getYear: function(dateValue) {
        try {
            if (!dateValue) return new Date().getFullYear();
            
            // Handle different date formats
            if (typeof dateValue === 'string') {
                // Handle YYYY-MM-DD format
                if (dateValue.match(/^\d{4}-\d{2}-\d{2}/)) {
                    return parseInt(dateValue.substring(0, 4));
                }
                // Handle MM/DD/YYYY or DD/MM/YYYY format
                if (dateValue.includes('/')) {
                    const parts = dateValue.split('/');
                    if (parts.length === 3) {
                        // Assume the year is the longest part or the last part
                        const yearPart = parts.find(p => p.length === 4) || parts[2];
                        return parseInt(yearPart);
                    }
                }
            }
            
            const date = new Date(dateValue);
            return !isNaN(date.getTime()) ? date.getFullYear() : new Date().getFullYear();
        } catch (error) {
            return new Date().getFullYear();
        }
    },
    
    getMonth: function(dateValue) {
        try {
            if (!dateValue) return new Date().getMonth() + 1;
            
            // Handle YYYY-MM-DD format
            if (typeof dateValue === 'string' && dateValue.match(/^\d{4}-\d{2}-\d{2}/)) {
                return parseInt(dateValue.substring(5, 7));
            }
            
            const date = new Date(dateValue);
            return !isNaN(date.getTime()) ? date.getMonth() + 1 : new Date().getMonth() + 1;
        } catch (error) {
            return new Date().getMonth() + 1;
        }
    },
    
    getDay: function(dateValue) {
        try {
            if (!dateValue) return new Date().getDate();
            
            // Handle YYYY-MM-DD format
            if (typeof dateValue === 'string' && dateValue.match(/^\d{4}-\d{2}-\d{2}/)) {
                return parseInt(dateValue.substring(8, 10));
            }
            
            const date = new Date(dateValue);
            return !isNaN(date.getTime()) ? date.getDate() : new Date().getDate();
        } catch (error) {
            return new Date().getDate();
        }
    },

    // Text functions
    excelLeft: function(text, numChars) {
        const str = String(text);
        return str.slice(0, numChars);
    },
    
    excelRight: function(text, numChars) {
        const str = String(text);
        return str.slice(-numChars);
    },
    
    excelMid: function(text, startNum, numChars) {
        const str = String(text);
        return str.slice(startNum - 1, startNum - 1 + numChars);
    },
    
    excelLen: function(text) {
        return String(text).length;
    },
    
    excelUpper: function(text) {
        return String(text).toUpperCase();
    },
    
    excelLower: function(text) {
        return String(text).toLowerCase();
    },

    // Logical functions
    excelIf: function(condition, valueIfTrue, valueIfFalse = '') {
        return condition ? valueIfTrue : valueIfFalse;
    },
    
    excelIsNumber: function(value) {
        return !isNaN(value) && !isNaN(parseFloat(value));
    },
    
    excelIsText: function(value) {
        return typeof value === 'string';
    },
    
    excelChoose: function(indexNum, ...values) {
        const index = Math.floor(Number(indexNum));
        if (index >= 1 && index <= values.length) {
            return values[index - 1];  // Convert from 1-based to 0-based index
        }
        return '';  // Return empty string if index is out of bounds
    },

    // Utility functions
    arrayPercentageGrowth: function(oldValues, newValues) {
        if (!Array.isArray(oldValues) || !Array.isArray(newValues)) return [];
        
        const result = [];
        const minLength = Math.min(oldValues.length, newValues.length);
        
        for (let i = 0; i < minLength; i++) {
            const oldVal = Number(oldValues[i]) || 0;
            const newVal = Number(newValues[i]) || 0;
            
            if (oldVal === 0) {
                result.push(newVal === 0 ? 0 : 100); // If old is 0, growth is either 0% or 100%
            } else {
                result.push(((newVal - oldVal) / oldVal) * 100);
            }
        }
        
        return result;
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
    },

    // Array utility functions
    arrayUnique: function(arr) {
        if (!Array.isArray(arr)) {
            return [];
        }
        return [...new Set(arr.filter(item => item !== null && item !== undefined))];
    }
};

// Make all functions available globally
Object.assign(window, ExcelHelpers);

// Also expose the ExcelHelpers object itself for internal function calls
window.ExcelHelpers = ExcelHelpers;
