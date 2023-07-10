const express = require("express");
const path = require("path");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const app = express();
app.use(express.json());
const dbPath = path.join(__dirname, "covid19India.db");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3003, () => {
      console.log("Server Running at http://localhost:3003/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};
initializeDBAndServer();

const convertDbToResponse = (dbO) => {
  return {
    stateId: dbO.state_id,
    stateName: dbO.state_name,
    population: dbO.population,
    districtId: dbO.district_id,
    districtName: dbO.district_name,
    cases: dbO.cases,
    cured: dbO.cured,
    active: dbO.active,
    deaths: dbO.deaths,
  };
};

// API 1

app.get("/states/", async (request, response) => {
  const getStatesQuery = `
        SELECT
            *
        FROM
            state
        ORDER BY
            state_id;`;
  const statesArray = await db.all(getStatesQuery);
  response.send(statesArray.map((eachState) => convertDbToResponse(eachState)));
});

// API 2

app.get("/states/:stateId/", async (request, response) => {
  const { stateId } = request.params;
  const getStateQuery = `
        SELECT 
            *
        FROM
            state
        WHERE
            state_id = ${stateId};`;
  const stateDetails = await db.get(getStateQuery);
  response.send(convertDbToResponse(stateDetails));
});

// API 3

app.post("/districts/", async (request, response) => {
  const districtDetails = request.body;
  const {
    districtName,
    stateId,
    cases,
    cured,
    active,
    deaths,
  } = districtDetails;
  const addDistrictQuery = `
    INSERT INTO district (district_name, state_id, cases, cured, active, deaths)
    VALUES
    (
        '${districtName}',
        ${stateId},
        ${cases},
        ${cured},
        ${active},
        ${deaths}
    );`;
  await db.run(addDistrictQuery);
  response.send("District Successfully Added");
});

// API 4

app.get("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const getDistrictDetails = `SELECT * FROM district WHERE district_id = ${districtId};`;
  const districtArray = await db.get(getDistrictDetails);
  response.send(convertDbToResponse(districtArray));
});

// API 5

app.delete("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const deleteDistrictQuery = `DELETE FROM district WHERE district_id = ${districtId};`;
  await db.run(deleteDistrictQuery);
  response.send("District Removed");
});

// API 6

app.put("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const districtDetails = request.body;
  const {
    districtName,
    stateId,
    cases,
    cured,
    active,
    deaths,
  } = districtDetails;
  const updateDistrictQuery = `
        UPDATE district SET
            district_name = '${districtName}',
            state_id = ${stateId},
            cases = ${cases},
            cured = ${cured},
            active = ${active},
            deaths = ${deaths}
        WHERE 
            district_id = ${districtId};`;
  await db.run(updateDistrictQuery);
  response.send("District Details Updated");
});

// API 7

app.get("/states/:stateId/stats", async (request, response) => {
  const { stateId } = request.params;
  const stateQuery = `
        SELECT
            SUM(cases),
            SUM(cured),
            SUM(active),
            SUM(deaths)
        FROM 
            district
        WHERE
            state_id = ${stateId};`;
  const stateDetails = await db.get(stateQuery);
  response.send({
    totalCases: stateDetails["SUM(cases)"],
    totalCured: stateDetails["SUM(cured)"],
    totalActive: stateDetails["SUM(active)"],
    totalDeaths: stateDetails["SUM(deaths)"],
  });
});

// API 8

app.get("/districts/:districtId/details/", async (request, response) => {
  const { districtId } = request.params;
  const stateQuery = `
        SELECT state_name
        FROM 
            state JOIN district 
            ON state.state_id = district.state_id
        WHERE
            district.district_id = ${districtId};`;
  const stateNameDetails = await db.get(stateQuery);
  response.send(convertDbToResponse(stateNameDetails));
});

module.exports = app;
