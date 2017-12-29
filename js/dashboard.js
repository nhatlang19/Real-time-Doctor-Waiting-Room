$(function () {
    var pubnub = new PubNub({
        publishKey : 'pub-c-8d51c116-482c-4048-8b3f-2f58b4d2f905',
        subscribeKey : 'sub-c-7072e924-ebe9-11e7-9869-1affed3c9741'
    });

    var viewModel = {
        patientProfiles: ko.observableArray([]),
        vseeIds: ko.observableArray([]),
        addProfile: function(payload) {
            var index = this.vseeIds.indexOf(payload.profile.vseeId);
            if (index == -1) {
                this.patientProfiles.unshift(payload);
                this.vseeIds.unshift(payload.profile.vseeId);
            }
        },
        removeProfile: function(payload) {
            this.patientProfiles.remove( function (item) { 
                return item.profile.vseeId == payload.profile.vseeId; 
            } ) 

            this.vseeIds.remove( function (item) { 
                return item == payload.profile.vseeId; 
            } ) 
        },
        callPatient: function(patient) {
            showInProgress(patient.profile);
            return true;
        }
    };

    ko.applyBindings(viewModel);

    pubnub.addListener({
        status: function(statusEvent) {
            if (statusEvent.category === "PNConnectedCategory") {
            }
        },
        message: function(m) {
            console.log(m);
            if(m.channel == 'dashboard') {
                var payload = m.message.payload;
                switch(payload.action) {
                    case 'join':
                        viewModel.addProfile(payload);
                        break;
                    case 'leave':
                        viewModel.removeProfile(payload);
                        leaveRoom(payload.profile);
                        break;
                }
            }
        },
        presence: function(presenceEvent) {
            // handle presence
            console.log(presenceEvent);
            var uuids = presenceEvent.uuids;
            console.log(uuids);
        }
    })  

    console.log("Subscribing..");
    pubnub.subscribe({
        channels: ['dashboard'],
        withPresence: true
    });

    function leaveRoom(profile) {
        var publishConfig = {
            channel : "patient-channel",
            message : {
                payload: {
                    action: 'leaveRoom',
                    profile: {
                        yourName: profile.yourName,
                        reasonForVisit: profile.reasonForVisit,
                        vseeId: profile.vseeId,
                    }
                }
            }
        }
        pubnub.publish(publishConfig, function(status, response) {
            console.log(status, response);
        })
    }

    function showInProgress(profile) {
        var publishConfig = {
            channel : "patient-channel",
            message : {
                payload: {
                    action: 'inProgress',
                    profile: {
                        yourName: profile.yourName,
                        reasonForVisit: profile.reasonForVisit,
                        vseeId: profile.vseeId,
                    }
                }
            }
        }
        pubnub.publish(publishConfig, function(status, response) {
            console.log(status, response);
        })
    }
});