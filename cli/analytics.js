const KeenAnalysis = require('keen-analysis');
const KeenTracking = require('keen-tracking');

const COLLECTIONS = {
    TIMENODES: 'timenodes'
};

// 5 minutes in milliseconds
const ACTIVE_CLINODES_POLLING_INTERVAL = 5 * 60 * 1000;

class Analytics {

    constructor(web3) {
        this.projectId = process.env.KEEN_PROJECT_ID;
        this.writeKey = process.env.KEEN_WRITE_KEY;
        this.readKey = process.env.KEEN_READ_KEY;

        this._web3 = web3;

        this.activeClinodes = 0;
        this.networkId = null;
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

    async initialize() {
        await this.getActiveNetwork();

        this.analysisClient = new KeenAnalysis({
            projectId: this.projectId,
            readKey: this.readKey
        });

        this.trackingClient = new KeenTracking({
            projectId: this.projectId,
            writeKey: this.writeKey
        });
    }

    async awaitInitialized() {
        if (!this.analysisClient || !this.trackingClient) {
            return new Promise((resolve) => {
                setTimeout(async () => {
                    resolve(await this.awaitInitialized());
                }, 700);
            })
        }
        return true;
    }

    async startAnalytics(nodeAddress) {
        nodeAddress = this._web3.sha3(nodeAddress);
        await this.awaitInitialized();
        this.notifyNetworkNodeActive(nodeAddress);
        this.pollActiveClinodesCount();
    }

    stopAnalytics() {
        if (this.notifyInterval) {
            clearInterval(this.notifyInterval);
            this.notifyInterval = null;
        }
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }
    }

    sendActiveTimeNodeEvent(nodeAddress, networkId = this.networkId) {
        const event = {
            nodeAddress,
            networkId,
            nodeType:'cli',
            status: 'active'
        };
        this.trackingClient.recordEvent(COLLECTIONS.TIMENODES, event);
    }

    notifyNetworkNodeActive(nodeAddress, networkId = this.networkId) {
        this.sendActiveTimeNodeEvent(nodeAddress, networkId)
        this.notifyInterval = setInterval(() => this.sendActiveTimeNodeEvent(nodeAddress, networkId), ACTIVE_CLINODES_POLLING_INTERVAL);
    }

    getActiveClinodesCount(networkId) {
        const count = new KeenAnalysis.Query('count_unique', {
            event_collection: COLLECTIONS.TIMENODES,
            target_property: 'nodeAddress',
            timeframe: 'previous_5_minutes',
            filters: [
                {
                    property_name: 'networkId',
                    operator: 'eq',
                    property_value: networkId
                },
                {
                    property_name: 'nodeType',
                    operator: 'eq',
                    property_value: 'cli'
                },
                {
                    property_name: 'status',
                    operator: 'eq',
                    property_value: 'active'
                }
            ]
        });

        this.analysisClient.run(count, (err, response) => {
            this.activeClinodes = response.result;
        });
    }

    async pollActiveClinodesCount() {
        await this.getActiveClinodesCount(this.networkId);

        this.pollInterval = setInterval(() => this.getActiveClinodesCount(this.networkId), ACTIVE_CLINODES_POLLING_INTERVAL);
    }
}

module.exports = { Analytics };