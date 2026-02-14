from qsresearch.strategies.base import BaseStrategy

class Strategy(BaseStrategy):
    def initialize(self, context):
        context.asset = self.symbol('AAPL')

    def handle_data(self, context, data):
        # Example using the new pre-computed factor store
        # momentum = data.current(context.asset, 'momentum_score')
        self.order_target_percent(context.asset, 1.0)
        self.record(price=data.current(context.asset, 'price'))

    # Helper methods that will be injected by the engine
    def symbol(self, s):
        raise NotImplementedError("Injected by engine")

    def order_target_percent(self, asset, weight):
        raise NotImplementedError("Injected by engine")

    def record(self, **kwargs):
        raise NotImplementedError("Injected by engine")
