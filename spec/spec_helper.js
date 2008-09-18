if (!("MBX" in window)) {
    MBX = {};
}

TH.eventCountCache = {},
TH.eventSubscriptions = [],
    
TH.countEvent = function (eventName) {
    TH.Mock.eventCountCache[eventName] = 0;
    TH.eventSubscriptions.push(MBX.EventHandler.subscribe([MBX.cssNamespace, MBX], eventName, function () {
        TH.Mock.eventCountCache[eventName]++;
    }));
};
    
TH.eventCountFor = function (eventName) {
    return TH.Mock.eventCountCache[eventName];
};

TH.resetEventCount = function () {
    TH.Mock.eventCountCache = {};
    TH.eventSubscriptions.each(function (sub) {
        MBX.EventHandler.unsubscribe(sub);
    });
    TH.Mock.eventSubscriptions = [];
};

Screw.Unit(function() {
    before(function() {
        TH.resetEventCount();
    });
});
