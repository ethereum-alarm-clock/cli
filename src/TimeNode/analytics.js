const KeenTracking = require('keen-tracking');

const COLLECTIONS = {
    TIMENODES: 'timenodes'
};

// 5 minutes in milliseconds
const ACTIVE_CLINODES_POLLING_INTERVAL = 2 * 60 * 1000;

class Analytics {

    constructor(web3, versions) {
        this.projectId = process.env.KEEN_PROJECT_ID;
        this.writeKey = process.env.KEEN_WRITE_KEY;

        this._web3 = web3;
        this.versions = versions;

        this.networkId = null;
        this.trackingClient = null;
        this.initialize();
    }

    async getActiveNetwork() {
        this._web3.version.getNetwork((err, res) => {
            if (err) {
                return;
            }
            this.networkId = res;
        })
    }

    initialize() {
        this.getActiveNetwork();

        this.trackingClient = new KeenTracking({
            projectId: this.projectId,
            writeKey: this.writeKey
        });
    }

    async awaitInitialized() {
        if (!this.trackingClient || !this.networkId) {
            return new Promise((resolve) => {
                setTimeout(async () => {
                    resolve(await this.awaitInitialized());
                }, 700);
            })
        } else {
            return true;
        }
    }

    async startAnalytics(nodeAddress) {
        await this.awaitInitialized();
        nodeAddress = this._web3.sha3(nodeAddress);
        this.notifyNetworkNodeActive(nodeAddress);
    }

    stopAnalytics() {
        if (this.notifyInterval) {
            clearInterval(this.notifyInterval);
            this.notifyInterval = null;
        }
    }

    sendActiveTimeNodeEvent(nodeAddress, networkId = this.networkId) {
        const event = {
            nodeAddress,
            networkId,
            eacVersions: this.versions,
            nodeType:'cli',
            status: 'active'
        };
        this.trackingClient.recordEvent(COLLECTIONS.TIMENODES, event);
    }

    notifyNetworkNodeActive(nodeAddress) {
        this.sendActiveTimeNodeEvent(nodeAddress)
        this.notifyInterval = setInterval(() => this.sendActiveTimeNodeEvent(nodeAddress), ACTIVE_CLINODES_POLLING_INTERVAL);
    }
}

module.exports = Analytics;