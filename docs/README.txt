Motionbox EventHandler

More information:
    http://code.google.com/p/motionbox/wiki/EventHandlerDocumentation

Introduction:

The EventHandler uses a technique called "event delegation" to handle browser/javascript events.  You can read more about event delegation here:  http://icant.co.uk/sandbox/eventdelegation/
The Motionbox implementation is based on the event bubbling ideas brought to YUI by Caridy Patiño Mayea:  http://yuiblog.com/blog/2007/09/13/bubbling-library-by-caridy/

MBX.EventHandler brings these same conveniences to the prototype.js developer and adds custom event handling as well.

The basic idea is that we listen for key interesting events at the document.body level (waiting for these events to bubble from their targets).  We then fire off these events to any handlers that have been registered with the EventHandler.

This technique adds a lot of benefits (see articles above).  The two most notable are:  fewer browser/DOM event handlers (which eat memory and processing time) and the ability to bind to events before the elements are available in the DOM.  This is especially useful for AJAX applications where the DOM is being updated as there is no need to (re)create all your observers.


Implementation:

MBX.EventHandler listens to either element IDs, classes or single css selectors (p.my_class:first-child).

Right now MBX.EventHandler listens to the following events:  "mouseout", "click", "mouseover", "keypress", "change", "blur"
Any event that bubbles to document is a good candidate for the EventHandler, these are just what we have started with.

IMPORTANT NOTE:  "change", "blur" do NOT bubble in IE6,7 and hence are not usable with the EventHandler in those browsers. 

Given:
function my_listener(evt) {
   console.dir(evt);
}

<body>
  <ul id="unordered_list" class="my_ul_class">
    <li id="one" class="my_li_class">First</li>
    <li id="two" class="my_li_class">Second</li>
  </ul>
</body>

You can now:

MBX.EventHandler.subscribe("#one", "click", my_listener);  // this will trigger 'my_listener' only by clicking on the li with the id of "one"
or
MBX.EventHandler.subscribe(".my_li_class", "click", my_listener);  // this will trigger 'my_listener' by clicking either of the LIs below

All three of the required arguments may be an array:
MBX.EventHandler.subscribe([".my_ul_class", "#one"], ["click", "mouseover"], [my_listener, my_second_listener]);

NOTE: Remember that you can subscribe to these IDs or classes at ANY time after the MBX.EventHandler object is available (well before the dom is ready).

Since we are handling these events outside of the normal browser implementation, you are not confined to browser events:
MBX.EventHandler.subscribe("#one", "my_custom_event_name", my_listener);

which you could then fire with:
MBX.EventHandler.fireCustom($("one"), "my_custom_event_name");

fireCustom also allows the optional extension of custom events with any data of your choosing:
MBX.EventHandler.fireCustom($("one"), "my_custom_event_name", {'customAttribute': "this is cool"});

The line above would add "customAttribute" to the event being passed to the subscribed listeners.  In this case, the event being passed to "my_listener" would look like this:
evt = {'target': $("one"), 'type': "my_custom_event_name", 'customAttribute': "this is cool"}

NOTE:  The target that is being sent to fireCustom and that is being added to the event is an actual DOM element (not an ID or class).


Unsubscribing:

In rare cases, you may want to remove a behavior from a class or id.  When subscribing to an event, MBX.EventHandler will return an object to you that you can later use to unsubscribe:

var myEventObj = MBX.EventHandler.subscribe(".my_li_class", "click", my_listener);  // this will trigger 'my_listener' by clicking either of the LIs below
MBX.EventHandler.unsubscribe(myEventObj); // 'my_listener' will no longer be triggered by click events


API:

MBX.EventHandler has the following three public functions:

subscribe(specifiers, eventTypes, functionsToCall)
  specifiers = a string (or optional array of strings) specifying either a class or an id to subscribe to
  eventTypes = a string (or optional array of strings) specifying the name of the events to subscribe to
  functionsToCall = a function (or optional array of functions) to call upon receiving the event.  These functions should accept an Event as their first argument.
  --
  returns: eventHandlerObject

unsubscribe(handlerObj)
  handlerObj = the object returned by the subscribe function

fireCustom(target, eventName, opts)
  target = DOM element
  eventName = the name of the event to fire (eg, "click" or "my_custom_event")
  opts = optional object with which to extend the event that is fired
