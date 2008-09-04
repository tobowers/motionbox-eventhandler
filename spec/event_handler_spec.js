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
            var clickWasCalled, sub;
            before(function () {
                clickWasCalled = 0;
                sub = MBX.EventHandler.subscribe(".href_class", "click", function () { clickWasCalled++ })
                eventSubscriptions.push(sub);
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
            
            it("should allow you to unsubscribe", function () {
                MBX.EventHandler.unsubscribe(sub);
                TH.click($$(".href_class").first());
                expect(clickWasCalled).to(equal, 0);
            });
            
        });
        
        describe("subscribing to an id", function () {
            var clickWasCalled, sub;
            before(function () {
                clickWasCalled = 0;
                sub = MBX.EventHandler.subscribe("#href_id", "click", function () { clickWasCalled++ });
                eventSubscriptions.push(sub);
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
            
            it("should allow you to unsubscribe", function () {
                MBX.EventHandler.unsubscribe(sub);
                TH.click($("href_id"));
                expect(clickWasCalled).to(equal, 0);
            });
        });
        
        describe("custom events", function () {
            var MyCustomEvent, sub;
            before(function () {
                MyCustomEvent = 0;
                sub = MBX.EventHandler.subscribe("#href_id", "MyCustomEvent", function () { MyCustomEvent++ })
                eventSubscriptions.push(sub);
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
            
            it("should allow you to unsubscribe", function () {
                MBX.EventHandler.unsubscribe(sub);
                MBX.EventHandler.fireCustom($("href_id"), "MyCustomEvent");
                expect(MyCustomEvent).to(equal, 0);
            });
            
        });
        
        describe('subscribing to an object', function () {
            var called;
            var funcCall = function () {
                called++;
            };
            describe("non DOM object", function () {
                var someObj = {foo: 'bar'};
                var id;
                before(function () {
                    called = 0;
                    eventSubscriptions.push(MBX.EventHandler.subscribe(someObj, 'myEvent', funcCall));
                    
                    id = someObj.__MotionboxEventHandlerMaker;
                    expect(typeof id).to(equal, "number");
                });

                it("should add the function to the subscriptions", function () {
                    expect(MBX.EventHandler.debugSubscriptions()['objects'][id]['myEvent'][0]).to(equal, funcCall);
                });

                it('should respond to events', function () {
                    MBX.EventHandler.fireCustom(someObj, 'myEvent');
                    expect(called).to(equal, 1);
                });
            });
            
            describe("DOM object", function () {
                var someObj = document.body;
                var id;
                before(function () {
                    called = 0;
                    eventSubscriptions.push(MBX.EventHandler.subscribe(someObj, 'myEvent', funcCall));
                    id = someObj.__MotionboxEventHandlerMaker;
                    expect(typeof id).to(equal, "number");
                });

                it("should add the function to the subscriptions", function () {
                    expect(MBX.EventHandler.debugSubscriptions()['objects'][id]['myEvent'][0]).to(equal, funcCall);
                });

                it('should respond to events', function () {
                    MBX.EventHandler.fireCustom(someObj, 'myEvent');
                    expect(called).to(equal, 1);
                });
            });
            
        });
        
        describe("onDomReady events", function () {
            var func = function () {};
            it('should allow subscriptions to the dom:ready event', function () {
                eventSubscriptions.push(MBX.EventHandler.onDomReady(func));
                var id = document.__MotionboxEventHandlerMaker;
                expect(id).to_not(be_null);
                expect(MBX.EventHandler.debugSubscriptions()['objects'][id]["dom:loaded"][0]).to(equal, func);
            });
        });
        
        describe("deferring functions", function () {
            var MyCustomEvent = 0;
            var someObj = {};
            var sub;
            before(function () {
                sub = MBX.EventHandler.subscribe(someObj, "MyCustomEvent", function () { MyCustomEvent++ }, { defer: true });
                eventSubscriptions.push(sub);
            });
            
            it("should not fire in this thread", function () {
                MBX.EventHandler.fireCustom(someObj, "MyCustomEvent");
                
                // this one should be 0 since we're not threading yet
                expect(MyCustomEvent).to(equal, 0);
            });
            
            it("should have fired by now", function () {
                expect(MyCustomEvent).to(equal, 1); 
            });
            
            describe('with multiple deferred subscriptions', function () {
                before(function () {
                    sub = MBX.EventHandler.subscribe(someObj, "MyCustomEvent", function () { MyCustomEvent++ }, { defer: true });
                    eventSubscriptions.push(sub);
                });
                
                it("should not fire in this thread", function () {
                    MBX.EventHandler.fireCustom(someObj, "MyCustomEvent");
                
                    // this one should be 0 since we're not threading yet
                    expect(MyCustomEvent).to(equal, 1);
                });
                
                it("should both have fired by now", function () {
                    expect(MyCustomEvent).to(equal, 3); 
                });
                
            });
            
            
            describe("an event with both deferred and regular subscriptions", function () {
                var MyOtherCustomEvent = 0;
                before(function () {
                    sub = MBX.EventHandler.subscribe(someObj, "someOtherEvent", function () { MyOtherCustomEvent++ }, { defer: true });
                    eventSubscriptions.push(sub);
                    sub = MBX.EventHandler.subscribe(someObj, "someOtherEvent", function () { MyOtherCustomEvent++ });
                    eventSubscriptions.push(sub);
                });
                
                it("should fire the regular subscription in this thread", function () {
                    MBX.EventHandler.fireCustom(someObj, "someOtherEvent");
                    expect(MyOtherCustomEvent).to(equal, 1);
                });
                
                it("should still fire the deferred function in this thread", function () {
                    expect(MyOtherCustomEvent).to(equal, 2);
                });
            });
            
            describe("unsubscribing deferring functions", function () {
                before(function () {
                    MyCustomEvent = 0;
                    MBX.EventHandler.unsubscribe(sub);
                });
                
                it("should not fire in this thread", function () {
                    MBX.EventHandler.fireCustom(someObj, "MyCustomEvent");

                    // this one should be 0 since we're not threading yet
                    expect(MyCustomEvent).to(equal, 0);
                });

                it("should not fire in this thread either", function () {
                    expect(MyCustomEvent).to(equal, 0); 
                });
            });
            
        });
        
    });
});
