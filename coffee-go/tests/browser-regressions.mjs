// Run from an existing ego-browser task: await run(task.page('p1')).
// Test-only clock/GPS/storage are injected by fixture.html; production is untouched.
import assert from "node:assert/strict";
export async function run(page, base = "http://localhost:8017") {
  const run = Date.now();
  async function open(mode) {
    await page.goto(
      `${base}/coffee-go/tests/fixture.html?case=${mode}&run=${run}`,
    );
    await page.click('button:has-text("위치 연결하고 이어하기")');
    await page.waitForFunction(() =>
      document.querySelector(".map-info")?.textContent.includes("9마리"),
    );
  }
  async function fit(width, height, selector) {
    await page.cdp("Emulation.setDeviceMetricsOverride", {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: true,
    });
    const result = await page.evaluate((selector) => {
      const r = document.querySelector(selector).getBoundingClientRect();
      return {
        fits:
          r.top >= 0 &&
          r.left >= 0 &&
          r.right <= innerWidth &&
          r.bottom <= innerHeight,
        rootFits:
          document.querySelector("#app").getBoundingClientRect().bottom <=
          innerHeight,
      };
    }, selector);
    assert.ok(
      result.fits && result.rootFits,
      `${selector} fits ${width}×${height}`,
    );
  }
  await open("team");
  await fit(568, 320, ".menu-ball");
  await page.click('button[aria-label="주변 캐릭터와 레이드"]');
  const previous = await page.evaluate(
    () => document.querySelector(".nearby-list button").dataset.id,
  );
  await page.evaluate(() => window.fixture.advance(600001));
  await page.waitForFunction(
    (previous) =>
      document.querySelector(".nearby-list button").dataset.id !== previous,
    previous,
  );
  // Wait for the fixture's next real watcher callback after advancing its clock.
  await page.evaluate(
    () => new Promise((resolve) => setTimeout(resolve, 5100)),
  );
  await page.click(".nearby-list button >> nth=0");
  assert.equal(await page.evaluate(() => document.body.dataset.screen), "raid");
  await page.click('[data-action="team-toggle"] >> nth=0');
  assert.equal(
    await page.evaluate(() => document.querySelector("#start-raid").disabled),
    true,
  );
  await page.click('[data-action="recommend"]');
  assert.equal(
    await page.evaluate(() => document.querySelector("#start-raid").disabled),
    false,
  );
  await page.click("#start-raid");
  assert.equal(
    await page.evaluate(() => document.body.dataset.screen),
    "battle",
  );
  for (const size of [
    [568, 320],
    [667, 375],
  ])
    await fit(...size, ".battle-actions");
  await page.click('[data-action="attack"]');
  console.log(
    "PASS nearby rollover, six-member gate, landscape battle controls",
  );
  await open("empty");
  await page.click('button[aria-label="주변 캐릭터와 레이드"]');
  await page.click('button:has-text("야생") >> nth=0');
  for (const size of [
    [568, 320],
    [667, 375],
  ])
    await fit(...size, ".capture-controls");
  assert.equal(
    await page.evaluate(() => document.querySelector("#throw-ball").disabled),
    true,
  );
  console.log("PASS landscape capture controls and empty bag");
  await open("quests");
  await page.click('button[aria-label="퀘스트 연구"]');
  assert.equal(
    await page.evaluate(
      () => document.querySelector('[data-action="claim"]').disabled,
    ),
    false,
  );
  await page.evaluate(() => window.fixture.advance(86400000));
  await page.waitForFunction(
    () => document.querySelector('[data-action="claim"]').disabled,
  );
  console.log("PASS research date rollover");
}
