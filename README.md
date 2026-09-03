# Cloud-Based Electricity Usage Monitor

## Run in VS Code

1. Install Node.js.
2. Open this folder in VS Code.
3. Open Terminal.
4. Run:
   `npm start`
5. Open:
   `http://localhost:5000`

## Demo admin login
Email: admin@example.com
Password: admin123

## Features
- Register and login
- Electricity usage calculator
- Automatic unit calculation
- Estimated bill
- Monthly usage limit
- Usage history
- Appliance-wise consumption chart
- Delete usage records
- Responsive dashboard
- No MongoDB required
- Uses a local JSON database for easy setup
- Ready for Node.js cloud deployment

## Formula
Units = Watts × Hours × Days / 1000

## Bill estimate
A simple sample tariff is used:
- First 100 units: ₹4/unit
- Next 100 units: ₹6/unit
- Above 200 units: ₹8/unit

This tariff is only for project demonstration and can be changed in `public/app.js`.
