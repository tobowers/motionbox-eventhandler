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
        
    });
});
