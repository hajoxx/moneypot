/*!
 * IndexedMap
 * Copyright(c) 2014 Tobias Lindig
 * MIT Licensed
 */

/*!!! NOTE:
Altered to export the AMD module as anonymous

Export map as a property
*/

/*global define:false*/
(function( factory ) {
    // make it public

    if(typeof define === 'function' && define.amd) {
        // as __named__ AMD module
        define(factory);
    } else if(typeof module === 'object' && typeof define !== 'function') {
        //as node module
        exports = module.exports = factory();
    } else if(window) {
        // as global class to window
        window.IndexedMap = factory();
    }
}(function() {
    "use strict"; //enable ECMAScript 5 Strict Mode

    function IndexedMap() {
        //ensure it called with 'new'
        if (!(this instanceof IndexedMap)) {
            return new IndexedMap();
        }

        /// {Object} hash map to store the value for a key
        this._map = {};
        /// {Array.<string>} array to store the keys in order
        this._list = [];
    }
    IndexedMap.prototype = {
        // ///////////////////////////////
        // properties getter
        /**
         * the count of entries
         */
        get length() {
            return this._list.length;
        },

        /**
         * array of keys in the current order.
         *
         * That is not a clone, it is the real keys array of the indexedMap. So do not
         * add, change or remove elements. That would result in an inconsistent state of indexedMap itself.
         *
         * The advantage of not cloning the key map is, that you can easily manipulate
         * the order of keys, if you like. So you could use the reverse or sort method of Array.
         */
        get keys() {
            return this._list;
        },

        get map() {
            return this._map;
        },

        index: function(key) {
            return this._list.indexOf(key);
        },

        keyAt: function(index) {
            return this._list[index] || null;
        },

        // ///////////////////////////////
        // member functions
        /**
         * checks, if given key is in map.
         * @return {boolean} true, if it could found otherwise false
         */
        has: function(key) {
            return this._map.hasOwnProperty(key);
        },

        /**
         * Sort the map, that method manipulate the indexedMap.
         * This function is analog to the sort function of Array.
         * if no callback is specified, keys will be sorted lexicographically
         *
         * @param callback {function(this:IndexedMap, valueA:any, valueB:any ):number } -optional-
         *      called in context of indexedMap
         *      compareFunction have to return
         *          0 for equal,
         *          <0 for a < b
         *          >0 for a > b
         *
         *  @return the indexedMap
         */
        sort: function(callback) {
            if (typeof(callback) === 'function') {
                var self = this;
                this._list.sort(function(a, b) {
                    return callback.call(self, self._map[a], self._map[b]);
                });
            } else {
                //sort keys lexicographically
                this._list.sort();
            }
            return this;
        },

        /**
         * Returns the first key, where callback function returns true.
         *
         * @param {function(this:IndexedMap, key:string, value:any ):boolean} callback -required-
         *  - called for every entry in context of indexedMap.
         *    return true will stop the search and return the value of current visited entry.
         *
         * @param {number} startIndex -optional- position to start the search, default: 0
         *
         * @return value of first entry found
         *      or null, if nothing found
         */
        find: function(callback, startIndex) {
            if (typeof(callback) === 'function') {
                var i = (typeof(startIndex) === 'number' && startIndex > 0) ? startIndex : 0;
                for (; i < this._list.length; ++i) {
                    if (callback.call(this, this._list[i], this._map[this._list[i]]) === true) {
                        return this._map[this._list[i]];
                    }
                }
            }
            return null;
        },

        /**
         * Iterate over the indexedMap. Start at given startIndex. Run until end
         * or the given callback returns 'false'.
         *
         * @param {function(this:IndexedMap, key:string, value:any):boolean} callback  -required-
         *  - called for every entry in context of current IndexedMap.
         *  - stop loop from within the callback function by returning false.
         * @param {number} startIndex -optional- position to start the run, default: 0
         *
         * @return the indexedMap
         *      or null for error (missing callback)
         */
        each: function(callback, startIndex) {
            if (typeof(callback) !== 'function') {
                return null;
            }
            var i = (typeof(startIndex) === 'number' && startIndex > 0) ? startIndex : 0;
            for (; i < this._list.length; ++i) {
                if (callback.call(this, this._list[i], this._map[this._list[i]]) === false) {
                    return this; //brake
                }
            }
            return this;
        },

        /**
         * @return value of first entry
         *      or null, if map is empty
         */
        getFirst: function() {
            if (this._list.length) {
                return this._map[this._list[0]];
            } else {
                return null;
            }
        },

        /**
         * @return value of last entry
         *      or null, if map is empty
         */
        getLast: function() {
            if (this._list.length) {
                return this._map[this._list[this._list.length - 1]];
            } else {
                return null;
            }
        },

        /**
         * @return value from entry next to given key
         *      or null, if key has no next
         */
        getNextOf: function(key) {
            var nextKey = this.nextKeyOf(key);
            if (nextKey) {
                return this._map[nextKey];
            } else {
                return null;
            }
        },

        /**
         * @return value from entry previous to given key
         *      or null, if key has no previous
         */
        getPrevOf: function(key) {
            var prevKey = this.prevKeyOf(key);
            if (prevKey) {
                return this._map[prevKey];
            } else {
                return null;
            }
        },

        /**
         * @return key from entry next to given key
         *      or null, if key has no next
         */
        nextKeyOf: function(key) {
            if (this.has(key)) {
                return this._list[this._list.indexOf(key) + 1];
            } else {
                return null;
            }
        },

        /**
         * @return key from entry previous to given key
         *      or null, if key has no previous
         */
        prevKeyOf: function(key) {
            if (this.has(key)) {
                return this._list[this._list.indexOf(key) - 1];
            } else {
                return null;
            }
        },


        /**
         * @return value for given key
         *      or null, if key was not found
         */
        get: function(key) {
            if (this.has(key)) {
                return this._map[key];
            } else {
                return null;
            }
        },

        /**
         * @return value at given index
         *      or null, if index was not found
         */
        getAt: function(index) {
            return this.get(this._list[index]);
        },

        /**
         * Overwrite the value for the given key.
         *
         * @return old value
         *      or null, if key was not found.
         *
         */
        set: function(key, value) {
            if (this.has(key)) {
                var oldValue = this._map[key];
                this._map[key] = value;
                return oldValue;
            } else {
                return null;
            }
        },

        setAt: function(index, value) {
            return this.set(this._list[index], value);
        },

        /**
         * Insert new element before the referenced element targetKey.
         * If reference is null or not found, new element is inserted at the end
         * of the list.
         *
         * @return value for key
         *      or null if !key or key always used
         */
        insert: function(key, value, targetKey) {
            return this.insertAt(key, value, this._list.indexOf(targetKey));
        },

        insertAt: function(key, value, targetIndex) {
            if (!key || this.has(key)) {
                //no key or key is used
                return null;
            }

            this._map[key] = value;
            if (typeof(targetIndex) !== 'number' || targetIndex < 0 || targetIndex >= this._list.length) {
                //add to end
                this._list.push(key);
                return this._map[key];
            } else {
                //add to target position
                this._list.splice(targetIndex, 0, key);
                return this._map[key];
            }
        },

        /**
         * Move the key to position of targetKey by inserting key before targetKey.
         * If targetKey is not found, key will be moved to the end.
         *
         * @return value for key
         *      or null if key was not found
         */
        move: function(key, targetKey) {
            if (!this.has(key)) {
                return null;
            }

            //remove only the key, not the value!
            var index = this._list.indexOf(key);
            this._list.splice(index, 1);

            //if targetKey not found, we get -1, that is safe for splice it will work at the end
            var targetIndex = this._list.indexOf(targetKey);
            this._list.splice(targetIndex, 0, key);

            return this._map[key];
        },

        moveAt: function(index, targetIndex) {
            this.move(this._list[index], this._list[targetIndex]);
        },

        /**
         * Remove the entry for the given key.
         *
         * @return old value
         *      or null, if key was not found.
         */
        remove: function(key) {
            if (!this.has(key)) {
                //key is not found
                return null;
            }

            var oldValue = this._map[key];
            delete this._map[key];
            var index = this._list.indexOf(key);
            this._list.splice(index, 1);

            return oldValue;
        },

        removeAt: function(index) {
            return this.remove(this._list[index]);
        }
    };

    return IndexedMap;
}));
