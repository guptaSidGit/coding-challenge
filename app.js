const express = require('express');
const mongoose = require('mongoose');
const fs = require('fs-extra');
const path = require('path');

// MongoDB Schema for Character
const characterSchema = new mongoose.Schema({
  name: String,
  level: Number,
  hitPoints: Number,
  tempHP: Number,
  classes: [{
    name: String,
    hitDiceValue: Number,
    classLevel: Number
  }],
  stats: {
    strength: Number,
    dexterity: Number,
    constitution: Number,
    intelligence: Number,
    wisdom: Number,
    charisma: Number
  },
  items: [{
    name: String,
    modifier: {
      affectedObject: String,
      affectedValue: String,
      value: Number
    }
  }],
  defenses: [{
    type: { type: String },
    defense: { type: String}
  }]
});

const Character = mongoose.model('Character', characterSchema);

const app = express();
app.use(express.json());  // Middleware to parse JSON request bodies

// MongoDB connection
mongoose.connect('mongodb://localhost/game', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Could not connect to MongoDB:', err));

// Read all JSON files and insert into MongoDB if not already present
const loadCharacters = async () => {
  const charactersDir = path.join(__dirname, 'characters');
  const files = await fs.readdir(charactersDir);

  for (const file of files) {
    if (file.endsWith('.json')) {
      const characterData = await fs.readJson(path.join(charactersDir, file));
      
      // Check if character already exists in DB
      const existingCharacter = await Character.findOne({ name: { '$regex': characterData.name, $options: 'i' } });
      if (!existingCharacter) {
        const newCharacter = new Character(characterData);
        await newCharacter.save();
        console.log(`Character ${characterData.name} saved to database.`);
      }
    }
  }
};

// Call the load function to insert characters into MongoDB on startup
loadCharacters();

// API Route to deal damage to a character
app.post('/dealDamage', async (req, res) => {
  const { characterName, damageType, damage } = req.body;
  const character = await Character.findOne({ name: { '$regex': characterName, $options: 'i' } });

  if (!character) {
    return res.status(404).send('Character not found');
  }

  // Calculate damage based on resistances and immunities
  let finalDamage = damage;
  const defense = character.defenses.find(def => def.type === damageType);
  
  if (defense) {
    if (defense.defense === 'immunity') {
      return res.send(`${characterName} is immune to ${damageType} damage.`);
    } else if (defense.defense === 'resistance') {
      finalDamage = Math.floor(damage / 2);  // Resistance halves the damage
    }
  }

  //Calculated impact absorbed by Temp HP
  let finalDamageNotAbsorbed = finalDamage;
  let tempHP = character.tempHP;

  if (tempHP >= finalDamage){
    tempHP -= finalDamage;
    finalDamageNotAbsorbed = 0;
  }else{
    tempHP = 0;
    finalDamageNotAbsorbed = finalDamage - tempHP;
  }

  character.tempHP = tempHP;

  // Update hit points
  let hitPoints = character.hitPoints;
  if(hitPoints > finalDamageNotAbsorbed){
    hitPoints -= finalDamageNotAbsorbed;
  }else{
    hitPoints = 0;
  }

  character.hitPoints = hitPoints;

  await character.save();

  res.send(`${characterName} took ${finalDamage} ${damageType} damage. Current HP: ${character.hitPoints}`);
});

// API Route to heal a character
app.post('/heal', async (req, res) => {
  const { characterName, healingAmount } = req.body;
  const character = await Character.findOne({ name: { '$regex': characterName, $options: 'i' } });

  if (!character) {
    return res.status(404).send('Character not found');
  }


  character.hitPoints += healingAmount;
  await character.save();

  res.send(`${characterName} healed for ${healingAmount} HP. Current HP: ${character.hitPoints}`);
});

// API Route to add temporary hit points
app.post('/addTemporaryHP', async (req, res) => {
  const { characterName, tempHP } = req.body;
  const character = await Character.findOne({ name: { '$regex': characterName, $options: 'i' } });

  if (!character) {
    return res.status(404).send('Character not found');
  }

  if (!character.tempHP || tempHP > character.tempHP) {
    character.tempHP = tempHP; // Replace with the higher value
  }else{
    return res.send(`${characterName} already has ${character.tempHP} temporary hit points. No changes made.`);
  }
  
  await character.save();

  res.send(`${characterName} now has ${tempHP} temporary hit points.`);
});

// API Route to get a character's data
app.get('/character/:name', async (req, res) => {
  const character = await Character.findOne({ name: { '$regex': req.params.name, $options: 'i' } });

  if (!character) {
    return res.status(404).send('Character not found');
  }

  res.json(character);
});

// Start server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
