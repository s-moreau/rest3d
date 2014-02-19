This is for eXist-db 2.1
It can be downloaded and installed from: http://sourceforge.net/projects/exist/files/Stable/2.1/

You'll have to add a few mime-types as below.
The most important one is the mime-type for .dae, otherwise the database will not be able to do xml queries on COLLADA documents

    <mime-type name="model/vnd.collada+xml" type="xml">
        <description>COLLADA document</description>
        <extensions>.dae</extensions>
    </mime-type>

    <mime-type type="application/x-glsl">
        <alias type="text/x-glsl"/>
        <sub-class-of type="text/plain"/>
        <comment>GLSL Shader file</comment>
        <glob pattern="*.glsl"/>
        <glob pattern="*.shader"/>
    </mime-type>
 
    <mime-type type="text/x-glsl-frag">
        <sub-class-of type="text/x-glsl"/>
        <comment>GLSL Fragment Shader file</comment>
        <glob pattern="*.frag"/>
    </mime-type>
 
    <mime-type type="text/x-glsl-es-frag">
        <sub-class-of type="text/x-glsl"/>
        <comment>GLSL/ES Fragment Shader file</comment>
        <glob pattern="*.fsh"/>
    </mime-type>
 
    <mime-type type="text/x-glsl-vert">
        <sub-class-of type="text/x-glsl"/>
        <comment>GLSL Vertex Shader file</comment>
        <glob pattern="*.vert"/>
    </mime-type>
 
    <mime-type type="text/x-glsl-es-vert">
        <sub-class-of type="text/x-glsl"/>
        <comment>GLSL/ES Vertex Shader file</comment>
        <glob pattern="*.vsh"/>
    </mime-type>
 
    <mime-type type="text/x-glsl-es-geometry">
        <sub-class-of type="text/x-glsl"/>
        <comment>GLSL/ES Geometry Shader file</comment>
        <glob pattern="*.gsh"/>
    </mime-type>
