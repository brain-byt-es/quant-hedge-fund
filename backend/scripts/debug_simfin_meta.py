import simfin as sf

from config.settings import get_settings


def check_simfin_columns():
    settings = get_settings()
    sf.set_api_key(settings.simfin_api_key)
    sf.set_data_dir("data/simfin")

    # Load companies metadata
    df = sf.load_companies(market='us')

    print("\n--- SimFin Companies Columns ---")
    print(df.columns.tolist())
    print("\n--- Sample Data ---")
    print(df.head(3))

if __name__ == "__main__":
    check_simfin_columns()
