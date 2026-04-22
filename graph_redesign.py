import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.ticker as ticker

######### ! Data Preprocessing ##########

# import data
raw = pd.read_excel('/Users/joyalissa/Documents/TU/6. Semester/Vis/assignments/Visualisierung/VPI_2015-2025.xlsx', header=None)

# Row 7 holds the category names (columns 2–14)
categories = raw.iloc[7, 2:].tolist()

# Dates are in column 1, data starts at row 10 (index 9 XD damn bug)
df = raw.iloc[9:, 1:].copy()
df.columns = ['Zeitraum'] + categories # set column names
df = df.dropna(subset=['Zeitraum']) # drop any blank rows
df[categories] = df[categories].apply(pd.to_numeric, errors='coerce') # convert to numeric, coerce errors to NaN (just in case)
df = df.reset_index(drop=True)

######### ! PLOT ##########
fig, ax = plt.subplots(figsize=(16, 7))

colors = plt.cm.tab20.colors  # 20 distinct colors

for i, col in enumerate(categories):
    # set labels
    ax.plot(df.index, df[col], label=col, color=colors[i % len(colors)], linewidth=1.5)


jan_mask = df['Zeitraum'].str.startswith('Jän') # only show january labels :)
ax.set_xticks(df.index[jan_mask])
ax.set_xticklabels(df['Zeitraum'][jan_mask], rotation=45, ha='right', fontsize=8) # hat to rotate for readability

ax.set_title('Verbraucherpreisindex (VPI) 2015–2025\nby category (base 2015 = 100)',
             fontsize=13, fontweight='bold')
ax.set_ylabel('Index (2015 = 100)')
ax.set_xlabel('Month')
ax.legend(loc='upper left', fontsize=7, ncol=2, framealpha=0.7)
ax.grid(axis='y', linestyle='--', alpha=0.4)

plt.tight_layout()
plt.savefig('vpi_plot.png', dpi=150, bbox_inches='tight')
print("Saved vpi_plot.png")