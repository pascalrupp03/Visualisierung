import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.ticker as ticker

######### ! Data Preprocessing ##########
# import data
raw = pd.read_excel('VPI_2015-2025.xlsx', header=None)

# Row 7 holds the category names (columns 2–14)
categories = raw.iloc[7, 2:].tolist()

# Dates are in column 1, data starts at row 10 (index 9 XD damn bug)
df = raw.iloc[9:, 1:].copy()
df.columns = ['Zeitraum'] + categories  # set column names
df = df.dropna(subset=['Zeitraum'])  # drop any blank rows
df[categories] = df[categories].apply(pd.to_numeric, errors='coerce')  # convert to numeric, coerce errors to NaN (just in case)
df[categories] = df[categories] - 100  # 0% = Basisjahr 2015
df = df.reset_index(drop=True) # reset index after dropping rows that had missing values, just to be safe

######### ! PLOT ##########
fig, ax = plt.subplots(figsize=(16, 7))

colors = plt.cm.tab20.colors  # 20 distinct colors

for i, col in enumerate(categories):
    # set labels
    ax.plot(df.index, df[col], label=col, color=colors[i % len(colors)], linewidth=1.5)

events = {
    'Jän.20': 'COVID-19',
    'Feb.22': 'Ukraine\nKrieg',
    'Jän.23': 'Inflations-\nhöhepunkt',
}

jan_jd_mask = df['Zeitraum'].str.startswith('Jahresdurchschnitt')
ax.set_xticks(df.index[jan_jd_mask])
ax.set_xticklabels(df['Zeitraum'][jan_jd_mask], rotation=45, ha='right', fontsize=8)

for datum, label in events.items():
    idx = df.index[df['Zeitraum'] == datum][0]
    ax.axvline(x=idx, color='red', linestyle=':', linewidth=1.2, alpha=0.7)
    ax.text(idx + 0.5, ax.get_ylim()[0] * 0.95, label, fontsize=9, color='red', va='bottom')

ax.set_title('Verbraucherpreisindex (VPI) 2015–2025\nby category (Veränderung seit 2015)',
             fontsize=13, fontweight='bold')
ax.set_ylabel('Veränderung seit 2015')

# tbh the next line is copied from stackoverflow
ax.yaxis.set_major_formatter(ticker.FuncFormatter(lambda x, _: f'{x:+.0f}%'))  # +20%, -5% usw.

ax.axhline(y=0, color='black', linestyle='--', linewidth=1, alpha=0.5, label='Basis 2015')  # Basiswert als gestrichelte Linie
ax.set_xlabel('Monat')
ax.legend(loc='upper left', fontsize=7, ncol=2, framealpha=0.7)
ax.grid(axis='y', linestyle='--', alpha=0.4)

plt.tight_layout()
plt.savefig('vpi_plot.png', dpi=150, bbox_inches='tight')
print("Saved vpi_plot.png")