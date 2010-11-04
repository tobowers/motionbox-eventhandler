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
    TH.each(TH.eventSubscriptions, function (sub) {
        MBX.EventHandler.unsubscribe(sub);
    });
    TH.Mock.eventSubscriptions = [];
};

TH.each = function (list, iterator) {
    if ("_" in window) {
        _.each(list, iterator);
    } else {
        list.each(iterator);
    }
};

TH.elementsByCSS = function (css) {
    if ("jQuery" in window) {
        var results = jQuery(css);
        if (!_.isArray(results)) {
            results = [results];
        }
        return results;
    } else {
        $$(css);
    }
};

Screw.Unit(function() {
    before(function() {
        TH.resetEventCount();
    });
});
