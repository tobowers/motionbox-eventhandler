Screw.Unit(function() {
    describe('MBX.EventHandler', function() {
        var eventSubscriptions;
        
        before(function () {
            eventSubscriptions = [];
            TH.insertDomMock("event_handler");
        });
        
        after(function () {
            // this removes the necessity to explicitly test unsubscribes
            eventSubscriptions.each(function (eventObject) {
                MBX.EventHandler.unsubscribe(eventObject);
            })
        });
        
        describe("subscribing to a class", function () {
            var clickWasCalled;
            before(function () {
                clickWasCalled = 0;
                eventSubscriptions.push(MBX.EventHandler.subscribe(".href_class", "click", function () { clickWasCalled++ }));
            });
            
            it("should listen to clicks on elements with the subscribed class", function () {
                TH.click($$(".href_class").first());
                expect(clickWasCalled).to(be_true);
            });
            
            it("should bubble up to the elements above the element receiving an event", function () {
                eventSubscriptions.push(MBX.EventHandler.subscribe(".wrapper", "click", function () { clickWasCalled++ }));
                TH.click($$(".href_class").first());
                expect(clickWasCalled).to(equal, 2);
            });
        });
        
        describe("subscribing to an id", function () {
            var clickWasCalled;
            before(function () {
                clickWasCalled = 0;
                eventSubscriptions.push(MBX.EventHandler.subscribe("#href_id", "click", function () { clickWasCalled++ }));
            });
            
            it("should listen to clicks on elements with the subscribed id", function () {
                TH.click($("href_id"));
                expect(clickWasCalled).to(be_true);
            });
            
            it("should bubble up to the elements above the element receiving an event", function () {
                eventSubscriptions.push(MBX.EventHandler.subscribe(".wrapper", "click", function () { clickWasCalled++ }));
                TH.click($("href_id"));
                expect(clickWasCalled).to(equal, 2);
            });
        });
        
        describe("custom events", function () {
            var MyCustomEvent;
            before(function () {
                MyCustomEvent = 0;
                eventSubscriptions.push(MBX.EventHandler.subscribe("#href_id", "MyCustomEvent", function () { MyCustomEvent++ }));
            });
            
            it("should fire on subscribed elements", function () {
                MBX.EventHandler.fireCustom($("href_id"), "MyCustomEvent");
                expect(MyCustomEvent).to(be_true);
            });
            
            it("should bubble up to the elements above the element receiving the event", function () {
                eventSubscriptions.push(MBX.EventHandler.subscribe(".wrapper", "MyCustomEvent", function () { MyCustomEvent++ }));
                MBX.EventHandler.fireCustom($("href_id"), "MyCustomEvent");
                expect(MyCustomEvent).to(equal, 2);
            });
            
            it("should allow a payload of objects", function () {
                var receivedEvent = {};
                eventSubscriptions.push(MBX.EventHandler.subscribe("#href_id", "MyCustomEvent", function (evt) { receivedEvent = evt }));
                MBX.EventHandler.fireCustom($("href_id"), "MyCustomEvent", {
                    someAttr: 'received'
                });
                expect(receivedEvent.someAttr).to(equal, 'received');
            });
        });
        
        describe('subscribing to an object', function () {
            var called;
            var funcCall = function () {
                called++;
            };
            var someObj = {foo: 'bar'};
            
            before(function () {
                called = 0;
                eventSubscriptions.push(MBX.EventHandler.subscribe(someObj, 'myEvent', funcCall));
            });
            
            it("should add the function to the subscriptions", function () {
                expect(MBX.EventHandler.debugSubscriptions()['objects'][1]['myEvent'][0]).to(equal, funcCall);
            });
            
            it('should respond to events', function () {
                MBX.EventHandler.fireCustom(someObj, 'myEvent');
                expect(called).to(equal, 1);
            });
            
            it("should add a marker to the object", function () {
                expect(someObj.__MotionboxEventHandlerMaker).to(equal, 1);
            });
        });
        
        describe("onDomReady events", function () {
            var func = function () {};
            it('should allow subscriptions to the dom:ready event', function () {
                MBX.EventHandler.onDomReady(func);
                var id = document.__MotionboxEventHandlerMaker;
                expect(id).to_not(be_null);
                expect(MBX.EventHandler.debugSubscriptions()['objects'][id]["dom:ready"][0]).to(equal, func);
            });
        })
        
    });
});
