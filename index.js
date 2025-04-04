import express from "express";
import { MongoClient, ObjectId, ServerApiVersion } from "mongodb";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();
const app = express();
const port = process.env.PORT || 4120;

// middleware
app.use(cors());
app.use(express.json());

// listner
app.listen(port, () => {
  console.log("This server is running on", port);
});

app.get("/data", (req, res) => {
  res.send("I am get the all data thank you");
});

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.5pkl8.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // my backedn code start form here
    const RoomCollection = client.db("all_room_db").collection("all_rooms");
    const BookedRoomCollection = client
      .db("bookedRoomDB")
      .collection("bookedRoom");

    // try to get all the rooms
    app.get("/featured_room", async (req, res) => {
      try {
        const data = await RoomCollection.find().toArray();
        const top_rated_rooms = data
          .sort((a, b) => b.price - a.price)
          .slice(0, 6);
        res.status(201).send(top_rated_rooms);
      } catch (err) {
        console.log(err);
        res
          .status(500)
          .json({ message: "Top rated room fetch failed", error: err });
      }
    });

    // get all room
    app.get("/all_room", async (req, res) => {
      try {
        const data = await RoomCollection.find().toArray();
        res.status(201).send(data);
      } catch (err) {
        res.status(500).json({ message: "All room fetch failed", error: err });
      }
    });

    // add a new booked
    app.post("/addBooked/:roomId", async (req, res) => {
      try {
        const roomId = req.params.roomId;
        const { checkOutDate, checkInDate } = req.body;
        const filter = { _id: new ObjectId(roomId) };
        const options = { upsert: true };
        const updateData = {
          $set: {
            checkInDate: checkInDate,
            checkOutDate: checkOutDate,
          },
        };

        // Validate dates
        if (new Date(checkInDate) >= new Date(checkOutDate)) {
          return res
            .status(400)
            .json({ error: "Check-out date must be after check-in date" });
        }

        const existingBooking = await RoomCollection.find({
          _id: new ObjectId(roomId),
          $or: [
            {
              checkInDate: { $lte: new Date(checkInDate) },
              checkOutDate: { $gt: new Date(checkInDate) },
            },
            {
              checkInDate: { $lt: new Date(checkOutDate) },
              checkOutDate: { $gte: new Date(checkOutDate) },
            },
            {
              checkInDate: { $gte: new Date(checkInDate) },
              checkOutDate: { $lte: new Date(checkOutDate) },
            },
          ],
        }).toArray();

        // alert
        if (existingBooking.length > 0) {
          return res
            .status(400)
            .json({ error: "Room not available for these dates!" });
        }

        // update data
        const resultUpdate = await RoomCollection.updateOne(
          filter,
          updateData,
          options
        );
        // res.status(201).send(resultUpdate)
        // booked data store in db
        const result = await BookedRoomCollection.insertOne(req.body);
        res
          .status(201)
          .json({ massege: "Booked data store successfuly", data: result });

        // catche for error checking
      } catch (error) {
        console.log(error);
        res
          .status(500)
          .json({ message: "Add a New Booking Failed", error: error });
      }
    });

    // booking date update
    app.put("/b_date_update/:roomId", async (req, res) => {
      const roomId = req.params.roomId;
      const data = req.body;
      console.log(data);
      const filter = { id: roomId };
      const d_update = {
        $set: {
          checkInDate: data?.checkInDate,
          checkOutDate: data?.checkOutDate,
        },
      };
      const resultUpdate = await BookedRoomCollection.updateOne(
        filter,
        d_update
      );
    });

    // cancel booking
    app.delete("/booking_cancel/:id", async (req, res) => {
      const roomId = req.params.id;
      const cursor = BookedRoomCollection.deleteOne({ id: roomId });
      res.send(cursor);
    });

    // get all room
    app.get("/myBookedroomp/:userUid", async (req, res) => {
      try {
        const userUid = req.params.userUid;
        const data = await BookedRoomCollection.find({
          userUid: userUid,
        }).toArray();
        res.status(201).send(data);
      } catch (err) {
        res
          .status(500)
          .json({ message: "myBookedRoom fetch failed", error: err });
      }
    });

    // my backed code end here

    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

//
//
