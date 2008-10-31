/**  event_handler
    @version 1.3
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
 *    specifiers = a string (or optional array of strings) specifying a class, id, or object to subscribe to
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
    var stdEvents = ["click", "mouseout", "mouseover", "keypress", "change"];
    /** these events do bubble, but are IE only */
    var ieFocusBlurEvents = ["focusin", "focusout"];
    /** these events don't bubble - but you can use a capturing style event to grab 'em outside of ie */
    var nonBubblingBlurFocusEvents = ["blur", "focus"];
    
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
    
    if (!Prototype.Browser.IE) {
        /** We get focus and blur to look like they're bubbling by using event capturing
            rathe than event bubbling
        */
        nonBubblingBlurFocusEvents.each(function (evtType) {
            eventListeners[evtType] = document.addEventListener(evtType, handleEvent, true);
        });
    } else {
        /** if it's IE - then we need to do focusin / focusout events = but we're gonna fix
            so it looks like a focus or blur event to our subscribers
        */
        var handleIEFocusEvents = function (evt) {
            var targetElement;
            //console.dir(evt);
             //the below fixes an intermittent prototype JS error
             if (Event && evt) {
                 try {
                     targetElement = evt.srcElement;
                 } catch (e) {
                 }
             }
             if (targetElement) {
                 var eventType;
                 switch (evt.type) {
                     case "focusin":
                        eventType = "focus";
                        break;
                     case "focusout":
                        eventType = "blur";
                        break;
                 }
                 functionsFromElementAndEvent(targetElement, evt, { eventType: eventType });
             }
        };
        
        ieFocusBlurEvents.each(function (evtType) {
           eventListeners[evtType] = document.observe(evtType, handleIEFocusEvents);
        });
    }

    var domReadyAlreadyFired = false;
    
    document.observe("dom:loaded", function () {
        domReadyAlreadyFired = true;
        MBX.EventHandler.fireCustom(document, "dom:loaded");
    });

    
    /** this holds the actual subscriptions in the form
    
        @example
          ids: {
              myId: {
                      myEventType: [function, function, function]
                 }
          }
          
        same for classes and objects (objects add a unique identifier);
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
        rules: {},
        objects: {}
    };
    
    var subscriptionMarker = 1;
    
    /**
        executes an array of functions sending the event to the function
    */
    var callFunctions = function (functionsToCall, evt) {
        while (functionsToCall.length > 0) {
            functionsToCall.pop()(evt);
        }
    };
    
    /**
        defers function for later execution
    */
    var deferFunctions = function (functionsToCall, evt) {
        var func;
        while (functionsToCall.length > 0) {
            func = functionsToCall.pop().wrap(function (orig) {
                orig(evt);
            });
            setTimeout(func, 0);
        }
    };
    
    /** if there is a listener defined for the evtType, then
        loop through those rules and compare them to target
        bad CSS selectors can throw up really bad JS errors,
    */
    var callFunctionsFromRules = function (target, evtType, evt) {
        if (!subscriptions.rules[evtType]) {
            return;
        }
        var functionsToCall = [];
        var functionsToDefer = [];
        for (prop in subscriptions.rules[evtType]) {
            if (subscriptions.rules[evtType].hasOwnProperty(prop) && target.match(prop)) {
                functionsToCall = functionsToCall.concat(subscriptions.rules[evtType][prop]);
                if (subscriptions.rules[evtType][prop].deferrable) {
                    functionsToDefer = functionsToDefer.concat(subscriptions.rules[evtType][prop].deferrable);
                }
            }
        }
        callFunctions(functionsToCall, evt);
        deferFunctions(functionsToDefer, evt);
    };
    
    /** go to the subscriptions.ids object and grab an array of all the functions that are subscribed to
        the eventType evtType... so subscriptions.ids[targetId][evtType] which will be an array of functions
    */
    var callFunctionsFromIdOrObject = function (specifierType, targetId, evtType, evt) {
        var returnArray = [];
        var deferArray = [];
        var subscriptionTarget = subscriptions[specifierType][targetId];
        if (subscriptionTarget && subscriptionTarget[evtType]) {
            returnArray = returnArray.concat(subscriptionTarget[evtType]);
            if (subscriptionTarget[evtType].deferrable) {
                deferArray = deferArray.concat(subscriptionTarget[evtType].deferrable);
            }
        }
        callFunctions(returnArray, evt);
        deferFunctions(deferArray, evt);
    };
    
    /** same as functionsFromId, but uses all classes on the target object and looks in
        subscriptions.classes object
    */
    var callFunctionsFromClasses = function (targetClasses, evtType, evt) {
        var functionsToCall = [];
        var functionsToDefer = [];
        var classObject;
        targetClasses = $A(targetClasses);
        for (var index = 0, classLen = targetClasses.length; index < classLen; ++index) {
            classObject = subscriptions.classes[targetClasses[index]];
            if (classObject && classObject[evtType]) {
                functionsToCall = functionsToCall.concat(classObject[evtType]);
                if (classObject[evtType].deferrable) {
                    functionsToDefer.concat(classObject[evtType].deferrable);
                }
            }
        }
        callFunctions(functionsToCall, evt);
        deferFunctions(functionsToDefer, evt);
    };
    
    /** given an element and an event type, call the functions held in the 
        subscriptions object
    */
    var functionsFromElementAndEvent = function (targetElement, evt, opts) {
        if (!targetElement) {
            return;
        }
        
        opts = opts || {};
        var evtType;
        if (opts.eventType) {
            evtType = opts.eventType;
        } else {
            evtType = evt.type;
        }
        
        if(targetElement.__MotionboxEventHandlerMaker) {
            callFunctionsFromIdOrObject("objects", targetElement.__MotionboxEventHandlerMaker, evtType, evt);
            if (!Object.isElement(targetElement)) {
                return;
            }
        }
        
        if (targetElement.id) {
            callFunctionsFromIdOrObject("ids", targetElement.id, evtType, evt);
        }
        
        if (targetElement.className) {
            var targetClasses = Element.classNames(targetElement);
            callFunctionsFromClasses(targetClasses, evtType, evt);
        }
        callFunctionsFromRules(targetElement, evtType, evt);
    
        //recursively call self walking up the tree
        if (targetElement != window && targetElement != document && targetElement.parentNode) {
            var upTreeNode = targetElement.parentNode;
            if (upTreeNode && upTreeNode.tagName && upTreeNode.tagName != "HTML") {
                functionsFromElementAndEvent($(upTreeNode), evt, opts);
            }
        }
    };
    
    /** handle the creation of ID or class based subscriptions for a single
        specifier arrays of types and functions
    */
    var createIdClassorObjectSubscription = function(specifierType, specifier, evtTypes, funcs, opts) {
        var subscriptionArray = [];
        if (!subscriptions[specifierType][specifier]) {
            subscriptions[specifierType][specifier] = {};
        }
        var specifierObject = subscriptions[specifierType][specifier];
        evtTypes.each(function (evtType) {
             if (!specifierObject[evtType]) {
                 specifierObject[evtType] = [];
             }
             if (opts.defer && !specifierObject[evtType].deferrable) {
                 specifierObject[evtType].deferrable = [];
             }
            
            funcs.each(function (func) {
                if (opts.defer) {
                    specifierObject[evtType].deferrable.push(func);
                } else {
                    specifierObject[evtType].push(func);
                }
                subscriptionArray.push({'specifierType': specifierType, 'eventType': evtType, 'func': func, 'specifier': specifier});
            });
        });
        return subscriptionArray;
    };
    
    /** handle a CSS selector based subscription for a single specifier and arrays of types and functions
    */
    var createRulesSubscription = function(specifier, evtTypes, funcs, opts) {
        var subscriptionArray = [];
        evtTypes.each(function (evtType) {
            if (!subscriptions.rules[evtType]) {
                subscriptions.rules[evtType] = {};
            }
            var specifierObject = subscriptions.rules[evtType];
            
            if (!specifierObject[specifier]) {
                specifierObject[specifier] = [];
            }
            if (opts.defer && !specifierObject[specifier].deferrable) {
                specifierObject[specifier].deferrable = [];
            }
            funcs.each(function (func) {
                if (opts.defer) {
                    specifierObject[specifier].deferrable.push(func);
                } else {
                    specifierObject[specifier].push(func);
                }
                subscriptionArray.push({'specifierType': 'rules', 'eventType': evtType, 'func': func, 'specifier': specifier});
            }); //each function
        }); // each event type
        return subscriptionArray;
    };
    
    var isId = function (specifierString) {
        return /^\#[\w-]+$/.test(specifierString);
    };
    
    var isClass = function (specifierString) {
        return /^\.[\w-]+$/.test(specifierString);
    };
    
    var isObject = function (specifier) {
        return typeof specifier == "object";
    };
    
    var getSubscriptionMarker = function (obj) {
        if (!obj.__MotionboxEventHandlerMaker) {
            obj.__MotionboxEventHandlerMaker = subscriptionMarker++;
        }
        return obj.__MotionboxEventHandlerMaker;
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
        
    if (Prototype.Browser.IE) {
        var destroyObservers = function () {
            stdEvents.each(function (evtType) {
                document.stopObserving(evtType, handleEvent);
            });
        };
        
        window.attachEvent('onbeforeunload', destroyObservers);
    } else {
        (function () {
            var methods = Object.keys(Event.Methods).inject({ }, function(m, name) {
                m[name] = Event.Methods[name].methodize();
                return m;
              });
        
            CustomEvent.prototype = CustomEvent.prototype || document.createEvent("HTMLEvents").__proto__;
            Object.extend(CustomEvent.prototype, methods);
        })();
    }
    
    return /** @lends MBX.EventHandler */ {
        //public functions
    
        /** institue the subscriber:  '#' indicates an id, "." indicates a class, any other string is
            considered a CSS Selector.  You may also pass in an object (or DomElement).
            subscribe with:
            @example
              MBX.EventHandler.subscribe(".myClass", "click", function (){ alert('hi'); });
            or:
            @example
              MBX.EventHandler.subscribe("p#blah.cool", "click", function(evt) {console.dir(evt);});
            @example
              var someObj = {};
              // the below will use a setTimeout to fire the function when "myEvent" is fired on someObj
              MBX.EventHandler.subscribe(someObj, "myEvent", function () {alert('hi'); }, {defer: true});
              
            events may be custom events
            
            @param {String or Object or Array} specifiers the Object, class, id or CSS selector that you want to subscribe to (or array of any of those)
            @param {String or Array} evtTypes the types of events you want to subscribe to (these can be arbitrary to allow custom events)
            @param {Function or Array} funcs the functions you want to be called with this subscription
            @param {Object} opts Right now only takes a "defer" option which will fire functions with setTimeout
            
            @returns A handler object that can be used to unsubscribe
            
            @see MBX.EventHandler.fireCustom
            @see MBX.EventHandler.unsubscribe
        */
        subscribe: function (specifiers, evtTypes, funcs, opts) {
            if (!Object.isArray(specifiers)) {
                specifiers = [specifiers];
            }
            if (!Object.isArray(evtTypes)) {
                evtTypes = [evtTypes];
            }
            if (!Object.isArray(funcs)) {
                funcs = [funcs];
            }
            opts = opts || {};
            var referenceArray = [];
    
            specifiers.each(function (specifier) {
                var specifierType;
                if (isObject(specifier)) {
                    specifierType = "objects";
                    specifier = getSubscriptionMarker(specifier);
                } else {
                    if (typeof specifier != "string") {
                        throw new Error("specifier was neither an object nor a string");
                    }
                    if (isId(specifier)) {
                        specifier = specifier.sub(/#/, "");
                        specifierType = "ids";
                    }
                    if (isClass(specifier)) {
                        specifierType = "classes";
                        specifier = specifier.sub(/\./, "");
                    }
                }
                
                //check if it matched id or class
                if (specifierType) {
                    referenceArray = referenceArray.concat(createIdClassorObjectSubscription(specifierType, specifier, evtTypes, funcs, opts));
                } else {
                    // we assume that anything not matching a class, id or object is a css selector rule
                    referenceArray = referenceArray.concat(createRulesSubscription(specifier, evtTypes, funcs, opts));
                } //end to rules handling
            }); // each specifier
            // return the array that can be used to unsubscribe
            return referenceArray;
        },
        
        /** Unsubscribe a previous subscribed handler
            @param {Object} handlerObjects the handler objects that were originally passed to the
                                                    subscriptions
            @example
              var handlerObj = MBX.EventHandler.subscribe("#blah", "click", function () {alert('hi')!});
              MBX.EventHandler.unsubscribe(handlerObj) // the subscription above is now removed
              
            @see MBX.EventHandler.subscribe
        */
        unsubscribe: function (handlerObjects) {
            var locator;
            handlerObjects.each(function (handlerObject) {
                if (!(handlerObject.specifierType && handlerObject.eventType && handlerObject.specifier) || typeof handlerObject.func != 'function') {
                    throw new Error('bad unsubscribe object passed to EventHandler.unsubscribe');
                }
                if (handlerObject.specifierType != "rules") {
                    locator = subscriptions[handlerObject.specifierType][handlerObject.specifier][handlerObject.eventType];
                    for (var i = 0, funcLen = locator.length; i < funcLen; ++i) {
                        if (locator[i] == handlerObject.func) {
                            subscriptions[handlerObject.specifierType][handlerObject.specifier][handlerObject.eventType].splice(i, 1);
                        }
                    }
                    locator = subscriptions[handlerObject.specifierType][handlerObject.specifier][handlerObject.eventType].deferrable;
                    if (locator) {
                        for (var i = 0, funcLen = locator.length; i < funcLen; ++i) {
                            if (locator[i] == handlerObject.func) {
                                subscriptions[handlerObject.specifierType][handlerObject.specifier][handlerObject.eventType].deferrable.splice(i, 1);
                            }
                        }
                    }
                } else {
                    locator = subscriptions[handlerObject.specifierType][handlerObject.eventType][handlerObject.specifier];
                    for (var i = 0, funcLen = locator.length; i < funcLen; ++i) {
                        if (locator[i] == handlerObject.func) {
                            subscriptions[handlerObject.specifierType][handlerObject.eventType][handlerObject.specifier].splice(i, 1);
                        }
                    }
                    locator = subscriptions[handlerObject.specifierType][handlerObject.eventType][handlerObject.specifier].deferrable;
                    if (locator) {
                        for (var i = 0, funcLen = locator.length; i < funcLen; ++i) {
                            if (locator[i] == handlerObject.func) {
                                subscriptions[handlerObject.specifierType][handlerObject.eventType][handlerObject.specifier].deferrable.splice(i, 1);
                            }
                        }
                    }
                }
    
            });
    
            return true;
        },
    
        /** fire a custom event of your choosing. Will notify any subscribers to that evt
            You can also attach a payload to the event that will be added to the events
            @param {Object} theTarget A dom element, or arbotrary object to fire the event on
            @param {String} evt the Event to fire
            @param {Object} opts (optional) the attributes to be attached to the event
            
            @example
              MBX.EventHandler.fireCustom($('element'), 'mycustomeevent');
              
            @example
              MBX.EventHandler.fireCustom($("element"), 'mycustomevent', {
                  theseAttributes: "will be attached to the event"
              });
              
            @see MBX.EventHandler.subscribe
        */
        fireCustom: function (theTarget, evt, opts) {
            if (theTarget) {
                opts = opts || {};
                if (Object.isElement(theTarget)) {
                    var theEvent = new CustomEvent(theTarget, evt, opts);
                    Event.extend(theEvent);
                    handleEvent(theEvent);
                } else {
                    callFunctionsFromIdOrObject("objects", getSubscriptionMarker(theTarget), evt, opts);
                }
            }
        },
        
        /** Accepts functions that will be fired as soon as the dom is ready (using prototypes dom:loaded event)
            By default, we fire onDomReady events using setTimeout
            If the dom:loaded event has already ocurred, we simply call the function
            @param {Function or Array} funcs the function(s) to be fired at the Dom Ready event
            @param {Object} opts (optional) add { defer: false } to *not* fire the function using a setTimeout
            @returns a handler object that can be used to unsubscribe
        */
        onDomReady: function (funcs, opts) {
            opts = opts || {};
            if (typeof opts.defer == 'undefined') {
                opts.defer = true;
            }
            
            if (!Object.isArray(funcs)) {
                funcs = [funcs];
            }
            if (domReadyAlreadyFired) {
                if (opts.defer) {
                    deferFunctions(funcs, "dom:loaded");
                } else {
                    callFunctions(funcs, "dom:loaded");
                }
            } else {
                var subHandler = MBX.EventHandler.subscribe(document, "dom:loaded", funcs, { defer: opts.defer });
                return subHandler;
            }
        },
        
        //TEST FUNCTION ONLY!
        dirSubscriptions: function () {
            console.dir(subscriptions);
        },
        dirEventListeners: function () {
            console.dir(eventListeners);
        },
        
        /** return the object that holds the subscriptions, useful for debugging or testing
            @returns {Object} private subscriptions object
        */
        debugSubscriptions: function () {
            return subscriptions;
        }
    };
})();
