var raytraceFS = `
struct Ray {
	vec3 pos;
	vec3 dir;
};

struct Material {
	vec3  k_d;	// diffuse coefficient
	vec3  k_s;	// specular coefficient
	float n;	// specular exponent
};

struct Sphere {
	vec3     center;
	float    radius;
	Material mtl;
};

struct Light {
	vec3 position;
	vec3 intensity;
};

struct HitInfo {
	float    t;
	vec3     position;
	vec3     normal;
	Material mtl;
};

uniform Sphere spheres[ NUM_SPHERES ];
uniform Light  lights [ NUM_LIGHTS  ];
uniform samplerCube envMap;
uniform int bounceLimit;

bool IntersectRay( inout HitInfo hit, Ray ray );

// Shades the given point and returns the computed color.
vec3 Shade( Material mtl, vec3 position, vec3 normal, vec3 view ) {
	vec3 color = vec3(0,0,0);
	vec3 lightDir, VDir, HDir;
	float SpecAng;

	for ( int i=0; i<NUM_LIGHTS; ++i ) {
		lightDir = normalize(lights[i].position - position);
		HitInfo hit;
        
		if (!IntersectRay(hit, Ray(position, lightDir))) {

			VDir = normalize(view - position);
			HDir = normalize(lightDir + VDir);
			SpecAng = max(dot(normal, HDir), 0.0);

			// Diffuse component
			color += mtl.k_d * max(dot(normal, lightDir), 0.0) * lights[i].intensity;

			// Specular component
			color += mtl.k_s * pow(SpecAng, mtl.n) * lights[i].intensity;
		}
	}
	return color;
}

// Intersects the given ray with all spheres in the scene
// and updates the given HitInfo using the information of the sphere
// that first intersects with the ray.
// Returns true if an intersection is found.
bool IntersectRay( inout HitInfo hitInfo, Ray ray )
{
    hitInfo.t = 1e30;
    bool isIntersectionFound = false;
    ray.dir = normalize(ray.dir);

    for ( int i=0; i<NUM_SPHERES; ++i ) {
        // TO-DO: Test for ray-sphere intersection
        // TO-DO: If intersection is found, update the given HitInfo
        float dotProduct = dot(ray.dir, ray.pos - spheres[i].center),
        sphereCenterDist = dot(ray.pos - spheres[i].center, ray.pos - spheres[i].center) - spheres[i].radius * spheres[i].radius;
        float delta = dotProduct * dotProduct - sphereCenterDist;
        if (delta > 0.0) {
            float t = - dotProduct - sqrt(delta);
            if (t > 0.0001 && t < hitInfo.t) {
                isIntersectionFound = true;
                hitInfo.t = t;
                hitInfo.position = ray.pos + ray.dir * t;
                hitInfo.normal = normalize(hitInfo.position - spheres[i].center);
                hitInfo.mtl = spheres[i].mtl;
            }
        }
    }
    return isIntersectionFound;
}

// Given a ray, returns the shaded color where the ray intersects a sphere.
// If the ray does not hit a sphere, returns the environment color.

vec4 RayTracer( Ray inputRay )
{
    HitInfo hitInfo;
    if ( IntersectRay( hitInfo, inputRay ) ) {
        vec3 viewDirection = normalize( -inputRay.dir );
        vec3 color = Shade( hitInfo.mtl, hitInfo.position, hitInfo.normal, viewDirection );
        
        // Compute reflections
        vec3 reflectionCoefficient = hitInfo.mtl.k_s;
        for ( int bounceCount=0; bounceCount<MAX_BOUNCES; ++bounceCount ) {
            if ( bounceCount >= bounceLimit ) break;
            if ( hitInfo.mtl.k_s.r + hitInfo.mtl.k_s.g + hitInfo.mtl.k_s.b <= 0.0 ) break;
            
            Ray reflectionRay;	// this is the reflection ray
            HitInfo reflectionHitInfo;	// reflection hit info
            
            // TO-DO: Initialize the reflection ray
            reflectionRay.pos = hitInfo.position;
            reflectionRay.dir = normalize(reflect(-viewDirection, hitInfo.normal));
            
            if ( IntersectRay( reflectionHitInfo, reflectionRay ) ) {
                // TO-DO: Hit found, so shade the hit point
                // TO-DO: Update the loop variables for tracing the next reflection ray
                viewDirection = normalize(-reflectionRay.dir);
                color += reflectionCoefficient * Shade(reflectionHitInfo.mtl, reflectionHitInfo.position, reflectionHitInfo.normal, viewDirection);
                reflectionCoefficient = reflectionCoefficient * reflectionHitInfo.mtl.k_s;
                hitInfo = reflectionHitInfo;
            } else {
                // The reflection ray did not intersect with anything,
                // so we are using the environment color
                color += reflectionCoefficient * textureCube( envMap, reflectionRay.dir.xzy ).rgb;
                break;	// no more reflections
            }
        }
        return vec4( color, 1 );	// return the accumulated color, including the reflections
    } else {
        return vec4( textureCube( envMap, inputRay.dir.xzy ).rgb, 0 );	// return the environment color
    }
}
`;
           