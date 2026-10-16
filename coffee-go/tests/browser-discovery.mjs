import assert from "node:assert/strict";
// Import from ego-browser nodejs and pass the existing task page.
export async function run(page, base = "http://localhost:8018") {
  const run = Date.now();
  await page.goto(`${base}/coffee-go/tests/fixture.html?case=shiny&run=${run}`);
  await page.waitForSelector('[data-action="berries"]');
  assert.equal(
    await page.evaluate(() =>
      document.querySelector(".shiny-badge")?.textContent.includes("색이 다른"),
    ),
    true,
  );
  for (const [width, height] of [
    [320, 640],
    [390, 844],
    [568, 320],
    [667, 375],
  ]) {
    await page.cdp("Emulation.setDeviceMetricsOverride", {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: true,
    });
    assert.equal(
      await page.evaluate(() => {
        const r = document
          .querySelector(".capture-controls")
          .getBoundingClientRect();
        return (
          r.bottom <= innerHeight &&
          r.left >= 0 &&
          r.right <= innerWidth &&
          document.documentElement.scrollWidth <= innerWidth
        );
      }),
      true,
      `capture controls fit ${width}x${height}`,
    );
  }
  await page.cdp("Emulation.clearDeviceMetricsOverride", {});
  const before = await page.evaluate(() =>
    parseInt(
      document.querySelector(".capture-tip").textContent.match(/\d+/)[0],
    ),
  );
  await page.click('[data-action="berries"]');
  await page.click('[data-action="feed-berry"][data-id="catch"]');
  const after = await page.evaluate(() => ({
    chance: parseInt(
      document.querySelector(".capture-tip").textContent.match(/\d+/)[0],
    ),
    count: fixture.read().berries.catch,
  }));
  assert.ok(after.chance > before);
  assert.equal(after.count, 2);
  await page.click('[data-action="berries"]');
  assert.equal(
    await page.evaluate(() =>
      [...document.querySelectorAll('[data-action="feed-berry"]')].every(
        (b) => b.disabled,
      ),
    ),
    true,
  );
  await page.click('[data-action="close-modal"]');
  await page.reload();
  assert.equal(
    await page.evaluate(() => fixture.read().pendingEncounter.berry),
    "catch",
  );
  await page.press("#throw-ball", "Enter");
  await page.waitForSelector(".result-panel");
  assert.deepEqual(
    await page.evaluate(() => ({
      shiny: fixture.read().pets.at(-1).shiny,
      species: fixture.read().pets.at(-1).speciesId,
      balls: fixture.read().balls.basic,
    })),
    { shiny: true, species: "icewolf", balls: 29 },
  );
  await page.reload();
  await page.click('[data-action="begin"]');
  await page.click('[aria-label="내 동료 보관함"]');
  await page.selectOption("#species-filter", "shiny");
  assert.equal(
    await page.evaluate(() => document.querySelectorAll(".pet-card").length),
    2,
  );
  console.log(
    "PASS berry probability, no stacking, reload, shiny capture/filter and mobile controls",
  );

  await page.goto(
    `${base}/coffee-go/tests/fixture.html?case=legacy&run=${run}`,
  );
  await page.waitForSelector('[data-action="begin"]');
  assert.deepEqual(
    await page.evaluate(() => ({
      version: fixture.read().version,
      master: fixture.read().balls.master,
      claim: fixture.read().research.claims.special,
      berries: fixture.read().berries,
    })),
    { version: 2, master: 1, claim: "life", berries: { catch: 3, calm: 3 } },
  );
  await page.click('[data-action="begin"]');
  await page.waitForFunction(() =>
    document.querySelector(".map-info")?.textContent.includes("9마리"),
  );
  await page.click('[aria-label="주변 캐릭터와 레이드"]');
  await page.click(".nearby-list button >> nth=0");
  assert.ok(
    await page.evaluate(
      () => document.querySelector(".weakness-line")?.textContent.length > 4,
    ),
  );
  await page.click('[data-action="type-help"]');
  assert.equal(
    await page.evaluate(
      () => document.querySelectorAll(".type-table>div").length,
    ),
    10,
  );
  await page.click('[data-action="close-modal"]');
  await page.click('[data-action="recommend"]');
  assert.equal(
    await page.evaluate(
      () => document.querySelectorAll(".pet-card.selected").length,
    ),
    6,
  );
  await page.click("#start-raid");
  await page.waitForSelector("#battle-matchup");
  const hp = await page.evaluate(
    () => document.querySelector("#boss-health").style.width,
  );
  await page.click('[data-action="attack"]');
  assert.notEqual(
    await page.evaluate(
      () => document.querySelector("#boss-health").style.width,
    ),
    hp,
  );
  for (const [width, height] of [
    [320, 640],
    [568, 320],
  ]) {
    await page.cdp("Emulation.setDeviceMetricsOverride", {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: true,
    });
    assert.equal(
      await page.evaluate(() => {
        const r = document
          .querySelector(".battle-actions")
          .getBoundingClientRect();
        return (
          r.bottom <= innerHeight &&
          r.top >= 0 &&
          document.documentElement.scrollWidth <= innerWidth
        );
      }),
      true,
    );
  }
  console.log(
    "PASS legacy migration retains master, type chart, team recommendation and actual battle",
  );
  await page.cdp("Emulation.clearDeviceMetricsOverride", {});
}
