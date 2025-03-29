const uploadImage = async (req, res) => {
  if (req.file) {
    const filePath = process.env.API || "http://localhost:3500";
    const image = `${filePath}/images/${req.file.filename}`;
    res.status(200).json({ message: "Upload image successfully", image });
  } else {
    res.status(500).json({ message: "Error uploading image" });
  }
};

module.exports = {
  uploadImage,
};
