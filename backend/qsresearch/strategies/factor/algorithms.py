from zipline.api import order_target_percent, record, symbol


def initialize(context):
      context.asset = symbol('AAPL')

def handle_data(context, data):
      order_target_percent(context.asset, 1.0)
      record(price=data.current(context.asset, 'price'))
