/**  event_handler
    @version 1.2
 *  @requires Prototype 1.6.0
 
 *  Copyright (c) 2008 Motionbox, Inc.
 *
 *  event_handler is freely distributable under
 *  the terms of an MIT-style license.
 *
 *  Permission is hereby granted, free of charge, to any person obtaining
 *  a copy of this software and associated documentation files (the
 *  "Software"), to deal in the Software without restriction, including
 *  without limitation the rights to use, copy, modify, merge, publish,
 *  distribute, sublicense, and/or sell copies of the Software, and to
 *  permit persons to whom the Software is furnished to do so, subject to
 *  the following conditions:
 *
 *  The above copyright notice and this permission notice shall be
 *  included in all copies or substantial portions of the Software.
 *
 *  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 *  EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 *  MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 *  NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
 *  LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 *  OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
 *  WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 *  For details, see the web site: http://code.google.com/p/motionbox
 *
 *
 *  @author Richard Allaway, Topping Bowers, Baldur Gudbjornsson, Matt Royal
 *
 *  MBX.event_handler is an implementation of event delegation based on the
 *  prototype library.
 *  Readme:  http://code.google.com/p/motionbox/wiki/EventHandlerDocumentation
 *  API:
 *
 *  MBX.event_handler has the following three public functions:
 *
 *  subscribe(specifiers, eventTypes, functionsToCall)
 *    specifiers = a string (or optional array of strings) specifying either a class or an id to subscribe to
 *    eventTypes = a string (or optional array of strings) specifying the name of the events to subscribe to
 *    functionsToCall = a function (or optional array of functions) to call upon receiving the event.
 *                      These functions should accept an Event as their first argument.
 *    --
 *    returns: handlerObj
 *
 *  unsubscribe(handlerObj)
 *    handlerObj = the object returned by the subscribe function
 *
 *  fireCustom(target, eventName, opts)
 *    target = DOM element
 *    eventName = the name of the event to fire (eg, "click" or "my_custom_event")
 *    opts = optional object with which to extend the event that is fired
 *--------------------------------------------------------------------------*/
  
if (!("MBX" in window)) {
    /** @namespace
        @ignore
    */
    MBX = {};
}
  
/**  @class EventHandler
     @name MBX.EventHandler */
MBX.EventHandler = (function () {
    /** 
        all the standard events we want to listen to on document.
        please note that 'change' and 'blur' DO NOT BUBBLE in IE - so you will need to do something
        extra for the Microsoft browsers
    */
    var stdEvents = ["mouseout", "click", "mouseover", "keypress", "change", "blur", "focus"];
    
    /** an object with all the event listeners we have listed by eventType
        gets filled in on init
    */
    var eventListeners = {};
    
     /** Event bubbles up to the document where the listeners are and fires this function
         if the target element matches anything in the subscribers object then the functions fire
         it continues to go all the way up the tree
         @function
     */
     var handleEvent = function (evt) {
         //for debug uncomment out the below
         //console.dir(evt);
         //console.log(Event.element(evt));
         //evt.isConsumed = false;
         var targetElement;
         //the below fixes an intermittent prototype JS error
         if (Event && evt) {
             try {
                 targetElement = Event.element(evt);
             } catch (e) {
             }
         }
         if (targetElement) {
             functionsFromElementAndEvent(targetElement, evt);
         }
    };
    
    /** subscribe to the listeners
    */
    stdEvents.each(function (evtType) {
        eventListeners[evtType] = document.observe(evtType, handleEvent);
    });
    
    /** this holds the actual subscriptions in the form
    
        @example
          ids: {
              myId: {
                      myEventType: [function, function, function]
                 }
          }
          
        same for classes
        rules however is the opposite (for speed sake)
        so:
        
        @example
          rules: {
              eventType: {
                  "my rule": [function, function, function]
              }
          }
    */
    var subscriptions = {
        ids: {},
        classes: {},
        rules: {}
    };
    
    /**
        executes an array of functions sending the event to the function
    */
    var callFunctions = function (functionsToCall, evt) {
        while (functionsToCall.length > 0) {
            functionsToCall.pop()(evt);
        }
    };
    
    /** if there is a listener defined for the evtType, then
        loop through those rules and compare them to target
        bad CSS selectors can throw up really bad JS errors,
    */
    var functionsFromRules = function (target, evtType) {
        if (!subscriptions.rules[evtType]) {
            return [];
        }
        var functionsToCall = [];
        for (prop in subscriptions.rules[evtType]) {
            if (subscriptions.rules[evtType].hasOwnProperty(prop) && target.match(prop)) {
                functionsToCall = functionsToCall.concat(subscriptions.rules[evtType][prop]);
            }
        }
        return functionsToCall;
    };
    
    /** go to the subscriptions.ids object and grab an array of all the functions that are subscribed to
        the eventType evtType... so subscriptions.ids[targetId][evtType] which will be an array of functions
    */
    var functionsFromId = function (targetId, evtType) {
        var returnArray = [];
        if (subscriptions.ids[targetId] && subscriptions.ids[targetId][evtType]) {
            returnArray = returnArray.concat(subscriptions.ids[targetId][evtType]);
        }
        return returnArray;
    };
    
    /** same as functionsFromId, but uses all classes on the target object and looks in
        subscriptions.classes object
    */
    var functionsFromClasses = function (targetClasses, evtType) {
        var functionsToCall = [];
        var classObject;
        targetClasses = $A(targetClasses);
        for (var index = 0, classLen = targetClasses.length; index < classLen; ++index) {
            classObject = subscriptions.classes[targetClasses[index]]
            if (classObject && classObject[evtType]) {
                functionsToCall = functionsToCall.concat(classObject[evtType]);
            }
        }
        return functionsToCall;
    };
    
    /** given an element and an event type, call the functions held in the 
        subscriptions object
    */
    var functionsFromElementAndEvent = function (targetElement, evt) {
        var evtType = evt.type;
        if (!targetElement) {
            return;
        }
        if (targetElement.id) {
            callFunctions(functionsFromId(targetElement.id, evtType), evt);
        }
        if (targetElement.className) {
            var targetClasses = Element.classNames(targetElement);
            callFunctions(functionsFromClasses(targetClasses, evtType), evt);
        }
        callFunctions(functionsFromRules(targetElement, evtType), evt);
    
        //recursively call self walking up the tree
        if (targetElement != window && targetElement != document && targetElement.parentNode) {
            var upTreeNode = targetElement.parentNode;
            if (upTreeNode && upTreeNode.tagName && upTreeNode.tagName != "HTML") {
                functionsFromElementAndEvent($(upTreeNode), evt);
            }
        }
    };
    
    /** handle the creation of ID or class based subscriptions for a single
        specifier arrays of types and functions
    */
    var createIdOrClassSubscription = function(specifierType, specifier, evtTypes, funcs) {
        var subscriptionArray = [];
        if (!subscriptions[specifierType][specifier]) {
            subscriptions[specifierType][specifier] = {};
        }
        var specifierObject = subscriptions[specifierType][specifier];
        evtTypes.each(function (evtType) {
            funcs.each(function (func) {
                if (!specifierObject[evtType]) {
                    specifierObject[evtType] = [func];
                }
                else {
                    specifierObject[evtType].push(func);
                }
                subscriptionArray.push({'specifierType': specifierType, 'eventType': evtType, 'func': func, 'specifier': specifier});
            });
        });
        return subscriptionArray;
    };
    
    /** handle a CSS selector based subscription for a single specifier and arrays of types and functions
    */
    var createRulesSubscription = function(specifier, evtTypes, funcs) {
        var subscriptionArray = [];
        evtTypes.each(function (evtType) {
            if (!subscriptions.rules[evtType]) {
                subscriptions.rules[evtType] = {};
            }
            var specifierObject = subscriptions.rules[evtType];
            funcs.each(function (func) {
                if (!specifierObject[specifier]) {
                    specifierObject[specifier] = [func];
                } else {
                    specifierObject[specifier].push(func);
                }
                subscriptionArray.push({'specifierType': 'rules', 'eventType': evtType, 'func': func, 'specifier': specifier});
            }); //each function
        }); // each event type
        return subscriptionArray;
    };
    
    // utility functions
    var isArray = function (obj) {
        if (obj) {
            return obj.constructor == Array;
        }
    };
    
    var isId = function(specifierString) {
        return /^\#[\w-]+$/.test(specifierString);
    };
    
    var isClass = function(specifierString) {
        return /^\.[\w-]+$/.test(specifierString);
    };
    
    var browserLikeEventExtender = {
        preventDefault: function () {},
        stopPropagation: function () {},
        pageX: 0,
        pageY: 0,
        clientX: 0,
        clientY: 0
    };
    
    var CustomEvent = function (theTarget, evt, opts) {
        this.type = evt;
        this.target = theTarget;
        this.srcElement = theTarget;
        this.eventName = evt;
        this.memo = {};
        Object.extend(this, opts);
        for (prop in browserLikeEventExtender) {
            if (browserLikeEventExtender.hasOwnProperty(prop)) {
                if (!this[prop]) {
                    this[prop] = browserLikeEventExtender[prop];
                }
            }
        }
        if (Prototype.Browser.IE) {
            Event.extend(this);
        }
    };
        
    if (!Prototype.Browser.IE) {
        (function () {
            var methods = Object.keys(Event.Methods).inject({ }, function(m, name) {
                m[name] = Event.Methods[name].methodize();
                return m;
              });
    
            CustomEvent.prototype = CustomEvent.prototype || document.createEvent("HTMLEvents").__proto__;
            Object.extend(CustomEvent.prototype, methods);
        })();
    }
    
    if (Prototype.Browser.IE) {
        var destroyObservers = function () {
            stdEvents.each(function (evtType) {
                document.stopObserving(evtType, handleEvent);
            });
        };
        
        window.attachEvent('onunload', destroyObservers);
    }
    
    return /** @lends MBX.EventHandler */ {
        //public functions
    
        /** institue the subscriber:  '#' indicates an id, "." indicates a class, anything else is considered
            a CSS Selector
            subscribe with:
            @example
              MBX.EventHandler.subscribe(".myClass", "click", function (){ alert('hi'); });
            or:
            @example
              MBX.EventHandler.subscribe("p#blah.cool", "click", function(evt) {console.dir(evt);});
            events may be custom events
            
            @param {String} specifiers the class, id or CSS selector that you want to subscribe to
            @param {String or Array} evtTypes the types of events you want to subscribe to
            @param {Function or Array} funcs the functions you want to be called with this subscription
            
            @returns A handler object that can be used to unsubscribe
            
            @see MBX.EventHandler.fireCustom.
            returns an object you can use to unsubscribe
        */
        subscribe: function (specifiers, evtTypes, funcs) {
            if (!isArray(specifiers)) {
                specifiers = [specifiers];
            }
            if (!isArray(evtTypes)) {
                evtTypes = [evtTypes];
            }
            if (!isArray(funcs)) {
                funcs = [funcs];
            }
            var referenceArray = [];
    
            specifiers.each(function (specifier) {
                var specifierType;
                if (isId(specifier)) {
                    specifier = specifier.sub(/#/, "");
                    specifierType = "ids";
                }
                if (isClass(specifier)) {
                    specifierType = "classes";
                    specifier = specifier.sub(/\./, "");
                }
                //check if it matched id or class
                if (specifierType) {
                    referenceArray = referenceArray.concat(createIdOrClassSubscription(specifierType, specifier, evtTypes, funcs));
                } else {
                    // we assume that anything not matching a class or id is a css selector rule
                    referenceArray = referenceArray.concat(createRulesSubscription(specifier, evtTypes, funcs));
                } //end to rules handling
            }); // each specifier
            // return the array that can be used to unsubscribe
            return referenceArray;
        },
        
        /** Unsubscribe a previous subscribed handler
            @param {Object or Array} handlerObjects the handler objects that were originally passed to the
                                                    subscriptions
            @example
              var handlerObj = MBX.EventHandler.subscribe("#blah", "click", function () {alert('hi')!});
              MBX.EventHandler.unsubscribe(handlerObj) // the subscription above is now removed
        */
        unsubscribe: function (handlerObjects) {
            handlerObjects.each(function (handlerObject) {
                if (!(handlerObject.specifierType && handlerObject.eventType && handlerObject.specifier) || typeof handlerObject.func != 'function') {
                    throw new Error('bad unsubscribe object passed to EventHandler.unsubscribe');
                }
                if (handlerObject.specifierType != "rules") {
                    var locator = subscriptions[handlerObject.specifierType][handlerObject.specifier][handlerObject.eventType];
                    for (var i = 0, funcLen = locator.length; i < funcLen; ++i) {
                        if (locator[i] == handlerObject.func) {
                            subscriptions[handlerObject.specifierType][handlerObject.specifier][handlerObject.eventType].splice(i, 1);
                        }
                    }
                } else {
                    var locator = subscriptions[handlerObject.specifierType][handlerObject.eventType][handlerObject.specifier];
                    for (var i = 0, funcLen = locator.length; i < funcLen; ++i) {
                        if (locator[i] == handlerObject.func) {
                            subscriptions[handlerObject.specifierType][handlerObject.eventType][handlerObject.specifier].splice(i, 1);
                        }
                    }
                }
    
            });
    
            return true;
        },
    
        /** fire a custom event of your choosing. Will notify any subscribers to that evt
            You can also attach a payload to the event that will be added to the events
            @param {DomElement} theTarget A dom element to fire the event on
            @param {String} evt the Event to fire
            @param {Object} opts (optional) the attributes to be attached to the event
            
            @example
              MBX.EventHandler.fireCustom($('element'), 'mycustomeevent');
              
            @example
              MBX.EventHandler.fireCustom($("element"), 'mycustomevent', {
                  theseAttributes: "will be attached to the event"
              });
        */
        fireCustom: function (theTarget, evt, opts) {
            opts = opts || {};
            var theEvent = new CustomEvent(theTarget, evt, opts);
            Event.extend(theEvent);
            handleEvent(theEvent);
        },
        //TEST FUNCTION ONLY!
        dirSubscriptions: function () {
            console.dir(subscriptions);
        },
        dirEventListeners: function () {
            console.dir(eventListeners);
        },
        debugSubscriptions: function () {
            return subscriptions;
        }
    };
})();
