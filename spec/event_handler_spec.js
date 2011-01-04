Screw.Unit(function() {
    describe('MBX.EventHandler', function() {
        var eventSubscriptions;
        
        before(function () {
            eventSubscriptions = [];
            TH.insertDomMock("event_handler");
        });
        
        after(function () {
            // this removes the necessity to explicitly test unsubscribes
            TH.each(eventSubscriptions, function (eventObject) {
                MBX.EventHandler.unsubscribe(eventObject);
            });
        });
        
        describe("subscribing to a class", function () {
            var clickWasCalled, sub;
            before(function () {
                clickWasCalled = 0;
                sub = MBX.EventHandler.subscribe(".href_class", "click", function () { clickWasCalled++ });
                eventSubscriptions.push(sub);
            });
            
            it("should listen to clicks on elements with the subscribed class", function () {
                TH.click(TH.elementsByCSS(".href_class")[0]);
                expect(clickWasCalled).to(equal, 1);
            });
            
            it("should bubble up to the elements above the element receiving an event", function () {
                eventSubscriptions.push(MBX.EventHandler.subscribe(".wrapper", "click", function () { clickWasCalled++ }));
                TH.click(TH.elementsByCSS(".href_class")[0]);
                expect(clickWasCalled).to(equal, 2);
            });
            
            it("should allow you to unsubscribe", function () {
                MBX.EventHandler.unsubscribe(sub);
                TH.click(TH.elementsByCSS(".href_class")[0]);
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
                TH.click("href_id");
                expect(clickWasCalled).to(be_true);
            });

            it("should bubble up to the elements above the element receiving an event", function () {
                eventSubscriptions.push(MBX.EventHandler.subscribe(".wrapper", "click", function () { clickWasCalled++ }));
                TH.click("href_id");
                expect(clickWasCalled).to(equal, 2);
            });

            it("should allow you to unsubscribe", function () {
                MBX.EventHandler.unsubscribe(sub);
                TH.click("href_id");
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
                MBX.EventHandler.fireCustom(document.getElementById("href_id"), "MyCustomEvent");
                expect(MyCustomEvent).to(be_true);
            });

            it("should bubble up to the elements above the element receiving the event", function () {
                eventSubscriptions.push(MBX.EventHandler.subscribe(".wrapper", "MyCustomEvent", function () { MyCustomEvent++ }));
                MBX.EventHandler.fireCustom(document.getElementById("href_id"), "MyCustomEvent");
                expect(MyCustomEvent).to(equal, 2);
            });

            it("should allow a payload of objects", function () {
                var receivedEvent = {};
                eventSubscriptions.push(MBX.EventHandler.subscribe("#href_id", "MyCustomEvent", function (evt) { receivedEvent = evt }));
                MBX.EventHandler.fireCustom(document.getElementById("href_id"), "MyCustomEvent", {
                    someAttr: 'received'
                });
                expect(receivedEvent.someAttr).to(equal, 'received');
            });

            it("should allow you to unsubscribe", function () {
                MBX.EventHandler.unsubscribe(sub);
                MBX.EventHandler.fireCustom(document.getElementById("href_id"), "MyCustomEvent");
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

                it("should allow a payload of objects", function () {
                    var receivedEvent = {};
                    eventSubscriptions.push(MBX.EventHandler.subscribe(someObj, "MyCustomEvent", function (evt) { receivedEvent = evt }));
                    MBX.EventHandler.fireCustom(someObj, "MyCustomEvent", {
                        someAttr: 'received'
                    });
                    expect(receivedEvent.someAttr).to(equal, 'received');
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
            describe("after dom:ready has already fired", function () {
                it('should fire the function right away if dom:ready has already happened', function (me) {
                    var fired = false;
                    var func = function () { fired = true };
                    MBX.EventHandler.onDomReady(func, { defer: false });
                    expect(fired).to(be_true);
                });

                it("should defer when no options are passed in", function (me) {
                    var fired = false;
                    var func = function () { fired = true };
                    MBX.EventHandler.onDomReady(func);
                    expect(fired).to_not(be_true);

                    using(me).wait(3).and_then(function () {
                        expect(fired).to(be_true);
                    });
                });

            });
        });

        describe("focus events", function () {
            var evtFired;

            it("should fire just like any other event", function () {
                document.getElementById("input_el").blur();
                evtFired = false;

                eventSubscriptions.push(MBX.EventHandler.subscribe("#input_el", "focus", function (evt) { evtFired = true; }));

                document.getElementById("input_el").focus();
                expect(evtFired).to(be_true);
            });

            it("should also bubble up", function () {
                document.getElementById("no_focus").focus();
                var wrapperEvtFired = false;
                eventSubscriptions.push(MBX.EventHandler.subscribe(".wrapper", "focus", function () { wrapperEvtFired = true; }));
                document.getElementById("input_el").focus();
                expect(wrapperEvtFired).to(be_true);
            });

        });

        describe("blur events", function () {

            it("should fire just like any other event", function (me) {
                var evtFired;
                document.getElementById("input_el").focus();
                evtFired = false;

                var subscription = MBX.EventHandler.subscribe("#input_el", "blur", function () { evtFired = true; });


                document.getElementById("input_el").blur();

                // focusein events in ie seem to not bubble synchronously... so we have to wait here
                using(me).wait(4).and_then(function () {
                    expect(evtFired).to(be_true);
                    MBX.EventHandler.unsubscribe(subscription);
                });

            });

            it("should also bubble up", function () {
                document.getElementById("input_el").focus();
                var wrapperEvtFired = false;
                eventSubscriptions.push(MBX.EventHandler.subscribe(".wrapper", "blur", function () { wrapperEvtFired = true; }));
                document.getElementById("input_el").blur();
                expect(wrapperEvtFired).to(be_true);

            });
        });
//
//        describe("deferring functions", function () {
//            var MyCustomEvent = 0;
//            var someObj = {};
//            var sub;
//            var myOtherCustomEvent = 0;
//            before(function () {
//                sub = MBX.EventHandler.subscribe(someObj, "MyCustomEvent", function () { MyCustomEvent++ }, { defer: true });
//                eventSubscriptions.push(sub);
//            });
//
//            it("should not fire right away, but should fire in the next thread", function (me) {
//                MBX.EventHandler.fireCustom(someObj, "MyCustomEvent");
//                expect(MyCustomEvent).to(equal, 0);
//            });
//
//            it("should have fired by this thread", function () {
//                expect(MyCustomEvent).to(equal, 1);
//            })
//
//            it("should still support event payloads", function (me) {
//                var evtReceived = {};
//                sub = MBX.EventHandler.subscribe(someObj, "anotherCustomEvent", function (evt) { evtReceived = evt; }, { defer: true });
//                eventSubscriptions.push(sub);
//
//                MBX.EventHandler.fireCustom(someObj, "anotherCustomEvent", { someAttr: "hi" });
//                using(me).wait(3).and_then(function () {
//                    expect(evtReceived.someAttr).to(equal, "hi");
//                });
//            });
//
//            describe('with multiple deferred subscriptions', function () {
//                before(function () {
//                    sub = MBX.EventHandler.subscribe(someObj, "MyCustomEvent", function () { myOtherCustomEvent++; }, { defer: true });
//                    eventSubscriptions.push(sub);
//                });
//
//                it("should fire both subscriptions", function (me) {
//                    MBX.EventHandler.fireCustom(someObj, "MyCustomEvent");
//
//                    // this one should be 0 since we're not threading yet
//                    expect(myOtherCustomEvent).to(equal, 0);
//                    using(me).wait(3).and_then(function () {
//                        expect(myOtherCustomEvent).to(equal, 1);
//                    });
//                });
//
//            });
//
//            describe("an event with both deferred and regular subscriptions", function () {
//                var MyOtherCustomEvent = 0;
//                before(function () {
//                    sub = MBX.EventHandler.subscribe(someObj, "someOtherEvent", function () { MyOtherCustomEvent++ }, { defer: true });
//                    eventSubscriptions.push(sub);
//                    sub = MBX.EventHandler.subscribe(someObj, "someOtherEvent", function () { MyOtherCustomEvent++ });
//                    eventSubscriptions.push(sub);
//                });
//
//                it("should fire the regular subscription right away, but defer the other", function (me) {
//                    MBX.EventHandler.fireCustom(someObj, "someOtherEvent");
//                    expect(MyOtherCustomEvent).to(equal, 1);
//                    using(me).wait(3).and_then(function () {
//                        expect(MyOtherCustomEvent).to(equal, 2);
//                    });
//                });
//            });
//
//            describe("unsubscribing deferring functions", function () {
//                before(function () {
//                    MBX.EventHandler.unsubscribe(sub);
//                });
//
//                it("should not fire ever (depends on previous tests being run)", function (me) {
//                    MBX.EventHandler.fireCustom(someObj, "MyCustomEvent");
//                    expect(MyCustomEvent).to(equal, 2);
//                    using(me).wait(2).and_then(function () {
//                        // is 2 from before
//                        expect(MyCustomEvent).to(equal, 2);
//                    });
//                });
//            });
//
//        });
        
    });
});
