$(function() {
    var pubnub = new PubNub({
        publishKey: 'pub-c-8d51c116-482c-4048-8b3f-2f58b4d2f905',
        subscribeKey: 'sub-c-7072e924-ebe9-11e7-9869-1affed3c9741'
    });

    var viewModel = {
        patientProfiles: ko.observableArray([]),
        addProfile: function(payload) {
            var index = this.patientProfiles.indexOf(
                ko.utils.arrayFirst(ko.utils.unwrapObservable(this.patientProfiles()), function(patient) {
                    return ko.utils.unwrapObservable(patient.profile.vseeId) == payload.profile.vseeId;
                })
            );
            if (index == -1) {
                this.patientProfiles.unshift(payload);
            }
        },
        removeProfile: function(payload) {
            this.patientProfiles.remove(function(item) {
                return item.profile.vseeId == payload.profile.vseeId;
            });
        },
        callPatient: function(patient) {
            showInProgress(patient.profile);
            return true;
        },
        updateTime: function(payload) {
            var index = this.patientProfiles.indexOf(
                ko.utils.arrayFirst(ko.utils.unwrapObservable(this.patientProfiles()), function(patient) {
                    return ko.utils.unwrapObservable(patient.profile.vseeId) == payload.profile.vseeId;
                })
            );

            if (index != -1) {
                var oldPatient = this.patientProfiles()[index];
                var mins = getWaitingTime(oldPatient.profile.timetoken, payload.profile.timetoken);

                payload.profile.timetoken = oldPatient.profile.timetoken;
                payload.profile.waitingTime = mins;

                this.patientProfiles.replace(this.patientProfiles()[index], {
                    profile: payload.profile
                });
            }
        }
    };

    function getWaitingTime(oldTimeToken, newTimeToken) {
        var date1 = new Date(oldTimeToken / 1e4)
        var date2 = new Date(newTimeToken / 1e4);
        var timeDiff = Math.abs(date2.getTime() - date1.getTime());
        var diffDays = Math.ceil(timeDiff / (1000));
        if (diffDays > 60) {
            diffDays = Math.ceil(timeDiff / (1000 * 60));
            return diffDays + ' min(s)';
        }

        return diffDays + ' second(s)';
    }

    ko.applyBindings(viewModel);

    pubnub.addListener({
        status: function(statusEvent) {
            if (statusEvent.category === "PNConnectedCategory") {}
        },
        message: function(m) {
            console.log(m);
            if (m.channel == 'dashboard') {
                var payload = m.message.payload;
                switch (payload.action) {
                    case 'join':
                        payload.profile.timetoken = m.timetoken;
                        payload.profile.waitingTime = '0 second';
                        viewModel.addProfile(payload);
                        break;
                    case 'update-time':
                        payload.profile.timetoken = m.timetoken;
                        viewModel.updateTime(payload);
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
            channel: "patient-channel",
            message: {
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
            channel: "patient-channel",
            message: {
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
