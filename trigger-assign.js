
const JOB_CARD_ID = "3118b370-0d67-4bef-8659-691ea7123549";
const ENGINEER_ID = "4fd74a5d-0ce7-4d37-89e2-c2e40b879e3c";

async function main() {
    try {
        console.log(`Assigning Engineer ${ENGINEER_ID} to JobCard ${JOB_CARD_ID}...`);

        const response = await fetch(`http://localhost:3001/api/job-cards/${JOB_CARD_ID}/assign-engineer`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ engineerId: ENGINEER_ID })
        });

        console.log("Response Status:", response.status);
        const text = await response.text();
        console.log("Response Body:", text);

    } catch (e) {
        console.error("Fetch Error:", e);
    }
}

main();
