const errorController=(req,res)=>{
    res.status(404).json({
        message:`${req.baseUrl} this url currently not available`
    })
}
module.exports=errorController